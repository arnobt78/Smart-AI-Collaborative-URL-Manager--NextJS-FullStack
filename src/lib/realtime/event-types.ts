export type RealtimeEventType =
  | "connected"
  | "heartbeat"
  | "error"
  | "unauthorized"
  | "list_updated"
  | "activity_created"
  | "comment_added"
  | "comment_updated"
  | "comment_deleted";

export type RealtimeListSummary = {
  id: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  updatedAt?: string | Date;
  createdAt?: string | Date;
  collaborators?: string[];
  urls?: unknown;
  [key: string]: unknown;
};

export type RealtimeActivity = {
  id: string;
  action: string;
  details: unknown;
  createdAt: string | Date;
  user: { id: string; email: string };
  [key: string]: unknown;
};

export type RealtimeChannelEvent = {
  type: RealtimeEventType;
  listId: string;
  timestamp: string;
  eventKey?: string;
  action?: string;
  userId?: string;
  userEmail?: string;
  slug?: string;
  urlId?: string;
  commentId?: string;
  urlCount?: number;
  commentCount?: number;
  clickCount?: number;
  deleted?: boolean;
  message?: string;
  list?: RealtimeListSummary;
  activity?: RealtimeActivity;
};

export function isRealtimeChannelEvent(
  value: unknown,
): value is RealtimeChannelEvent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RealtimeChannelEvent>;
  if (typeof candidate.type !== "string") return false;
  if (typeof candidate.listId !== "string") return false;
  if (typeof candidate.timestamp !== "string") return false;
  return true;
}

function hashRealtimePayload(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

export function getRealtimeEventKey(event: RealtimeChannelEvent): string {
  if (event.eventKey) return event.eventKey;

  if (event.type === "activity_created" && event.activity?.id) {
    return `activity:${event.activity.id}`;
  }

  if (
    (event.type === "comment_added" ||
      event.type === "comment_updated" ||
      event.type === "comment_deleted") &&
    event.commentId
  ) {
    return `comment:${event.commentId}:${event.type}`;
  }

  if (event.urlId && event.action) {
    return `url:${event.listId}:${event.urlId}:${event.action}:${event.timestamp}`;
  }

  if (event.action) {
    return `list:${event.listId}:${event.action}:${event.timestamp}`;
  }

  return `event:${event.type}:${event.listId}:${hashRealtimePayload(JSON.stringify(event))}`;
}
