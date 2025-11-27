import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListBySlug, getUserLists, type UrlItem } from "@/lib/db";
import { hasListAccess } from "@/lib/collaboration/permissions";
import {
  smartCollectionsService,
  type CollectionSuggestion,
  type DuplicateDetection,
} from "@/lib/ai/collections";

/**
 * GET /api/lists/[id]/collections
 * UNIFIED ENDPOINT: Returns collection suggestions, duplicates, and smart recommendations
 * This provides all collection-related data in a single call
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeDuplicates = searchParams.get("includeDuplicates") === "true";
    const minGroupSize = parseInt(searchParams.get("minGroupSize") || "2", 10);
    const maxCollections = parseInt(
      searchParams.get("maxCollections") || "10",
      10
    );
    const clearCache = searchParams.get("clearCache") === "true" || !!searchParams.get("_t"); // Cache-busting param (any _t param triggers cache clear)

    const list = await getListBySlug(id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check if user has access to this list
    const user = await getCurrentUser();
    const hasAccess = await hasListAccess(list, user);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urls = (list.urls as unknown as UrlItem[]) || [];

    if (urls.length < minGroupSize) {
      return NextResponse.json({
        suggestions: [],
        duplicates: [],
        message: "Not enough URLs to generate collections",
      });
    }

    // Get collection suggestions (with cache clearing option)
    const suggestions = await smartCollectionsService.suggestCollections(
      urls,
      list.id,
      {
        minGroupSize,
        maxCollections,
        useVectorSearch: true,
        clearCache: clearCache || false, // Force cache clear on refresh
      }
    );

    // Get duplicate detections (if requested)
    let duplicates: DuplicateDetection[] = [];
    if (includeDuplicates && user) {
      try {
        // Get all user's lists for duplicate detection
        const allLists = await getUserLists(user.id);
        const listsWithUrls = allLists
          .filter((l) => l.id !== list.id) // Exclude current list
          .map((l) => ({
            id: l.id,
            slug: l.slug,
            title: l.title,
            urls: (l.urls as unknown as UrlItem[]) || [],
          }));

        // OPTIMIZATION: For large lists (>20 URLs), only check a sample of URLs for duplicates
        // This prevents hundreds of vector searches that mostly return nothing
        const urlsToCheck = urls.length > 20 
          ? urls.slice(0, 20) // Only check first 20 URLs for large lists
          : urls; // Check all URLs for smaller lists

        console.log(`🔍 [DUPLICATES] Checking ${urlsToCheck.length} of ${urls.length} URLs for duplicates across ${listsWithUrls.length} other lists`);

        // Batch duplicate detection with concurrency limit (process 5 at a time)
        // This prevents overwhelming the system with too many simultaneous vector searches
        const concurrencyLimit = 5;
        
        for (let i = 0; i < urlsToCheck.length; i += concurrencyLimit) {
          const batch = urlsToCheck.slice(i, i + concurrencyLimit);
          
          // Process batch in parallel, but wait before starting next batch
          const batchPromises = batch.map((url) =>
            smartCollectionsService.detectDuplicates(url, listsWithUrls, list.id)
          );
          
          const batchResults = await Promise.all(batchPromises);
          const batchDuplicates = batchResults.filter(
            (d): d is DuplicateDetection => d !== null
          );
          duplicates.push(...batchDuplicates);
        }

        console.log(`✅ [DUPLICATES] Found ${duplicates.length} duplicate URL${duplicates.length !== 1 ? "s" : ""} after checking ${urlsToCheck.length} URLs`);
      } catch (error) {
        console.error("Failed to detect duplicates:", error);
        // Continue without duplicates
      }
    }

    return NextResponse.json({
      suggestions,
      duplicates,
      listId: list.id,
      urlCount: urls.length,
    });
  } catch (error) {
    console.error("❌ [COLLECTIONS] Failed to get collections:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get collections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/lists/[id]/collections
 * Create a new list from a collection suggestion
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { collectionId, name, description, urlIds } = body;

    if (!collectionId || !name || !Array.isArray(urlIds) || urlIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: collectionId, name, urlIds" },
        { status: 400 }
      );
    }

    const list = await getListBySlug(id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check if user has access
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasListAccess(list, user);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require edit permission to create collections (creates new list and modifies current list)
    // Only owners and editors can create collections, viewers cannot
    try {
      const { requirePermission } = await import("@/lib/collaboration/permissions");
      await requirePermission(list.id, user.id, "edit");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "You don't have permission to create collections";
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      );
    }

    // Get URLs to move to new collection
    const urls = (list.urls as unknown as UrlItem[]) || [];
    const collectionUrls = urls.filter((url) => urlIds.includes(url.id));

    if (collectionUrls.length === 0) {
      return NextResponse.json(
        { error: "No URLs found for collection" },
        { status: 400 }
      );
    }

    // Create new list (collection)
    const { createList, generateUniqueSlug } = await import("@/lib/db");
    const slug = await generateUniqueSlug(
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    );

    const newList = await createList({
      title: name,
      description: description || `Collection created from ${list.title}`,
      slug,
      urls: collectionUrls,
      userId: user.id,
      isPublic: false,
    });

    // Remove URLs from original list
    const remainingUrls = urls.filter((url) => !urlIds.includes(url.id));
    const { updateList } = await import("@/lib/db");
    await updateList(list.id, { urls: remainingUrls });

    // Create activity for both lists
    const { createActivity } = await import("@/lib/db/activities");
    const { publishMessage, CHANNELS } = await import("@/lib/realtime/redis");

    await Promise.all([
      createActivity(list.id, user.id, "collection_created", {
        collectionId: newList.id,
        collectionName: name,
        urlCount: collectionUrls.length,
      }),
      createActivity(newList.id, user.id, "collection_created", {
        sourceListId: list.id,
        sourceListName: list.title,
        urlCount: collectionUrls.length,
      }),
    ]);

    // Publish real-time updates
    await Promise.all([
      publishMessage(CHANNELS.listUpdate(list.id), {
        type: "list_updated",
        listId: list.id,
        action: "collection_created",
        timestamp: new Date().toISOString(),
      }),
      publishMessage(CHANNELS.listUpdate(newList.id), {
        type: "list_updated",
        listId: newList.id,
        action: "collection_created",
        timestamp: new Date().toISOString(),
      }),
    ]);

    return NextResponse.json({
      success: true,
      collection: {
        id: newList.id,
        slug: newList.slug,
        title: newList.title,
        urlCount: collectionUrls.length,
      },
    });
  } catch (error) {
    console.error("❌ [COLLECTIONS] Failed to create collection:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create collection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

