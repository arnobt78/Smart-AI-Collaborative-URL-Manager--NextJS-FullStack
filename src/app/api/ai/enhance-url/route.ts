import { NextRequest, NextResponse } from "next/server";
import { aiEnhancementService } from "@/lib/ai/enhancement";
import type { AIProvider } from "@/lib/ai/providers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, title, description, provider, options } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const result = await aiEnhancementService.enhanceUrl(
      {
        url,
        title,
        description,
      },
      {
        provider: provider as AIProvider | undefined,
        ...options,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to enhance URL",
          provider: result.provider,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error enhancing URL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to enhance URL",
      },
      { status: 500 }
    );
  }
}
