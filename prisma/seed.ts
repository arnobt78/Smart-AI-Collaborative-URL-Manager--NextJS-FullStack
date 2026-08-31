/**
 * Database Seed Script for daily-urlist
 *
 * This script migrates data from CSV files to PostgreSQL database.
 *
 * Migration Status: ✅ COMPLETED (December 19, 2025)
 * - All data successfully migrated to Hetzner VPS PostgreSQL database
 *
 * Usage:
 *   npm run db:seed
 *
 * Note: This script uses upsert, so it's safe to run multiple times.
 * It will update existing records or create new ones.
 */

import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// CSV file paths (update these to match your actual paths)
const CSV_DIR = "/Users/arnob_t78/Papers/Project Doc/db-migration/daily-urlist";

interface UserRow {
  id: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

interface ListRow {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  slug: string;
  urls: string; // JSON string
  user_id: string;
  is_public: string; // "true" or "false"
  collaborators: string; // JSON array string
  archivedUrls: string; // JSON string
  collaborator_roles: string; // JSON object string
}

interface SessionRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  last_activity_at: string;
}

interface CommentRow {
  id: string;
  list_id: string;
  url_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ActivityRow {
  id: string;
  list_id: string;
  user_id: string;
  action: string;
  details: string; // JSON string
  created_at: string;
}

async function parseCSV<T>(filePath: string): Promise<T[]> {
  const content = fs.readFileSync(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- CSV seed JSON is untyped
function parseJSONField(field: string): any {
  if (!field || field === "null" || field === "") {
    return null;
  }
  try {
    // Handle empty arrays/objects
    if (field === "[]") return [];
    if (field === "{}") return {};
    return JSON.parse(field);
  } catch (e) {
    console.warn(`Failed to parse JSON field: ${field}`, e);
    return field;
  }
}

function parseBoolean(value: string): boolean {
  return value === "true" || value === "1" || value === "t";
}

async function seedUsers() {
  console.log("🌱 Seeding users...");
  const users = await parseCSV<UserRow>(path.join(CSV_DIR, "users.csv"));

  for (const user of users) {
    try {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          password: user.password,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at),
        },
        create: {
          id: user.id,
          email: user.email,
          password: user.password,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at),
        },
      });
    } catch (error) {
      console.error(`Error seeding user ${user.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${users.length} users`);
}

async function seedLists() {
  console.log("🌱 Seeding lists...");
  const lists = await parseCSV<ListRow>(path.join(CSV_DIR, "lists.csv"));

  for (const list of lists) {
    try {
      await prisma.list.upsert({
        where: { id: list.id },
        update: {
          title: list.title,
          description: list.description || null,
          slug: list.slug,
          urls: parseJSONField(list.urls),
          archivedUrls: parseJSONField(list.archivedUrls),
          userId: list.user_id,
          isPublic: parseBoolean(list.is_public),
          collaborators: parseJSONField(list.collaborators) || [],
          collaboratorRoles: parseJSONField(list.collaborator_roles),
          createdAt: new Date(list.created_at),
          updatedAt: new Date(list.updated_at),
        },
        create: {
          id: list.id,
          title: list.title,
          description: list.description || null,
          slug: list.slug,
          urls: parseJSONField(list.urls),
          archivedUrls: parseJSONField(list.archivedUrls),
          userId: list.user_id,
          isPublic: parseBoolean(list.is_public),
          collaborators: parseJSONField(list.collaborators) || [],
          collaboratorRoles: parseJSONField(list.collaborator_roles),
          createdAt: new Date(list.created_at),
          updatedAt: new Date(list.updated_at),
        },
      });
    } catch (error) {
      console.error(`Error seeding list ${list.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${lists.length} lists`);
}

async function seedSessions() {
  console.log("🌱 Seeding sessions...");
  const sessions = await parseCSV<SessionRow>(
    path.join(CSV_DIR, "sessions.csv")
  );

  for (const session of sessions) {
    try {
      await prisma.session.upsert({
        where: { id: session.id },
        update: {
          userId: session.user_id,
          token: session.token,
          expiresAt: new Date(session.expires_at),
          createdAt: new Date(session.created_at),
          lastActivityAt: new Date(session.last_activity_at),
        },
        create: {
          id: session.id,
          userId: session.user_id,
          token: session.token,
          expiresAt: new Date(session.expires_at),
          createdAt: new Date(session.created_at),
          lastActivityAt: new Date(session.last_activity_at),
        },
      });
    } catch (error) {
      console.error(`Error seeding session ${session.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${sessions.length} sessions`);
}

async function seedComments() {
  console.log("🌱 Seeding comments...");
  const comments = await parseCSV<CommentRow>(
    path.join(CSV_DIR, "comments.csv")
  );

  for (const comment of comments) {
    try {
      await prisma.comment.upsert({
        where: { id: comment.id },
        update: {
          listId: comment.list_id,
          urlId: comment.url_id,
          userId: comment.user_id,
          content: comment.content,
          createdAt: new Date(comment.created_at),
          updatedAt: new Date(comment.updated_at),
        },
        create: {
          id: comment.id,
          listId: comment.list_id,
          urlId: comment.url_id,
          userId: comment.user_id,
          content: comment.content,
          createdAt: new Date(comment.created_at),
          updatedAt: new Date(comment.updated_at),
        },
      });
    } catch (error) {
      console.error(`Error seeding comment ${comment.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${comments.length} comments`);
}

async function seedActivities() {
  console.log("🌱 Seeding activities...");
  const activities = await parseCSV<ActivityRow>(
    path.join(CSV_DIR, "activities.csv")
  );

  for (const activity of activities) {
    try {
      await prisma.activity.upsert({
        where: { id: activity.id },
        update: {
          listId: activity.list_id,
          userId: activity.user_id,
          action: activity.action,
          details: parseJSONField(activity.details),
          createdAt: new Date(activity.created_at),
        },
        create: {
          id: activity.id,
          listId: activity.list_id,
          userId: activity.user_id,
          action: activity.action,
          details: parseJSONField(activity.details),
          createdAt: new Date(activity.created_at),
        },
      });
    } catch (error) {
      console.error(`Error seeding activity ${activity.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${activities.length} activities`);
}

async function main() {
  console.log("🚀 Starting database seed...\n");

  try {
    // Seed in order to maintain foreign key relationships
    await seedUsers();
    await seedLists();
    await seedSessions();
    await seedComments();
    await seedActivities();

    console.log("\n✨ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
