import { NextResponse } from "next/server";
import { z } from "zod";

/** REQ-0025: Shared non-disclosing validation boundary for external route input. */
/** List routes retain legacy slug support, so identifiers are not UUID-only. */
export const routeIdSchema = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);

/** REQ-0025: Shared identifier contracts for bodyless list URL mutations. */
export const listRouteParamsSchema = z.object({ id: routeIdSchema }).strict();

export const listUrlRouteParamsSchema = z.object({
  id: routeIdSchema,
  urlId: z.string().trim().min(1).max(128),
}).strict();

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().trim().email().max(320).transform((email) => email.toLowerCase());

export const passwordSchema = z.string().min(8).max(128);

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}).strict();

export const signUpSchema = signInSchema;

const optionalText = (limit: number) => z.string().trim().max(limit).optional();

export const listCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5_000).nullable().optional(),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  urls: z.array(z.unknown()).max(2_000).optional(),
  isPublic: z.boolean().optional(),
}).strict();

export const listPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5_000).nullable().optional(),
  isPublic: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const visibilitySchema = z.object({ isPublic: z.boolean() }).strict();

export const commentCreateSchema = z.object({
  urlId: z.string().trim().min(1).max(128),
  content: z.string().trim().min(1).max(10_000),
}).strict();

export const commentPatchSchema = z.object({
  commentId: uuidSchema,
  content: z.string().trim().min(1).max(10_000),
}).strict();

export const commentDeleteSchema = z.object({ commentId: uuidSchema }).strict();

export const collaboratorCreateSchema = z.object({
  email: emailSchema,
  role: z.enum(["editor", "viewer"]).default("editor"),
}).strict();

export const collaboratorUpdateSchema = z.object({
  email: emailSchema,
  role: z.enum(["editor", "viewer"]),
}).strict();

export const collaboratorDeleteSchema = z.object({ email: emailSchema }).strict();

export const bulkImportSchema = z.object({
  urls: z.array(z.object({
    url: z.string().url().max(2_048),
    title: optionalText(500),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
    notes: optionalText(10_000),
    reminder: optionalText(100),
    category: optionalText(100),
    isFavorite: z.boolean().optional(),
    isPinned: z.boolean().optional(),
  }).strict()).min(1).max(2_000),
}).strict();

export const jobListSchema = z.object({ listId: uuidSchema }).strict();

export const metadataRefreshSchema = z.object({ refresh: z.boolean().optional() }).strict();

export const collectionCreateSchema = z.object({
  collectionId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5_000).optional(),
  urlIds: z.array(z.string().trim().min(1).max(128)).min(1).max(2_000),
}).strict();

export const aiEnhanceSchema = z.object({
  url: z.string().url().max(2_048),
  title: optionalText(500),
  description: optionalText(10_000),
  provider: z.enum(["gemini", "groq", "openrouter", "huggingface"]).optional(),
  options: z.record(z.unknown()).optional(),
}).strict();

export const emailSendSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("welcome"), data: z.object({ userEmail: emailSchema, userName: optionalText(200) }).strict() }).strict(),
  z.object({ type: z.literal("collaborator-invite"), data: z.object({
    inviterEmail: emailSchema,
    inviterName: optionalText(200),
    listTitle: z.string().trim().min(1).max(200),
    listSlug: z.string().trim().min(1).max(160),
    inviteeEmail: emailSchema,
    role: z.enum(["editor", "viewer"]).optional(),
  }).strict() }).strict(),
]);

/** REQ-0025: JSON URL records remain extensible while all persisted fields are bounded. */
export const urlItemSchema = z.object({
  id: z.string().trim().min(1).max(128),
  url: z.string().url().max(2_048),
  title: optionalText(500),
  description: optionalText(10_000),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  isFavorite: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  category: optionalText(100),
  notes: optionalText(10_000),
  reminder: optionalText(100),
  clickCount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  position: z.number().int().min(0).max(100_000).optional(),
  healthStatus: z.enum(["healthy", "warning", "broken", "unknown"]).optional(),
  healthCheckedAt: z.string().datetime().optional(),
  healthLastStatus: z.number().int().min(100).max(599).optional(),
  healthResponseTime: z.number().int().min(0).max(120_000).optional(),
}).strict();

const urlMetadataSchema = z.object({
  title: optionalText(500), description: optionalText(10_000), image: z.string().url().max(2_048).optional(),
  favicon: z.string().url().max(2_048).optional(), siteName: optionalText(500),
}).strict();

export const archiveUrlSchema = z.object({
  urls: z.array(urlItemSchema).max(2_000).optional(),
  archivedUrls: z.array(urlItemSchema).max(2_000).optional(),
  action: z.enum(["archive", "restore"]).optional(),
  urlId: z.string().trim().min(1).max(128).optional(),
}).strict().refine((value) => value.urls !== undefined || value.archivedUrls !== undefined);

export const reorderUrlsSchema = z.object({
  urls: z.array(urlItemSchema).max(2_000),
  action: z.enum(["url_added", "url_deleted", "url_updated", "url_reordered"]).optional(),
}).strict();

export const createUrlSchema = z.object({
  url: z.string().url().max(2_048), title: optionalText(500), tags: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  notes: optionalText(10_000), reminder: optionalText(100), category: optionalText(100), metadata: urlMetadataSchema.optional(),
  isDuplicate: z.boolean().optional(),
}).strict();

export const updateUrlSchema = z.union([
  z.object({ urlId: z.string().trim().min(1).max(128), updates: urlItemSchema.partial(), metadata: urlMetadataSchema.optional() }).strict(),
  z.object({ urls: z.array(urlItemSchema).max(2_000), action: z.literal("reorder").optional(), metadata: urlMetadataSchema.optional() }).strict(),
]);

export const deleteUrlSchema = z.object({ urlId: z.string().trim().min(1).max(128) }).strict();

type ValidatedRequest<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export function invalidRequestResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export function parseRouteParams<TSchema extends z.ZodTypeAny>(
  value: unknown,
  schema: TSchema,
): ValidatedRequest<z.output<TSchema>> {
  const parsed = schema.safeParse(value);

  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, response: invalidRequestResponse() };
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<ValidatedRequest<z.output<TSchema>>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { success: false, response: invalidRequestResponse() };
  }

  return parseRouteParams(body, schema);
}

export async function parseOptionalJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<ValidatedRequest<z.output<TSchema> | undefined>> {
  const text = await request.text();
  if (!text.trim()) return { success: true, data: undefined };
  try {
    return parseRouteParams(JSON.parse(text) as unknown, schema);
  } catch {
    return { success: false, response: invalidRequestResponse() };
  }
}
