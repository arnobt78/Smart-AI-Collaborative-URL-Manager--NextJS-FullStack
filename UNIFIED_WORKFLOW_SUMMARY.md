# Unified API Workflow Summary

## Overview
**Goal:** One unified API endpoint (`/api/lists/[slug]/updates`) that returns both list data and activities in a single call. This eliminates duplicate API calls and ensures consistency across all screens.

## Complete Workflow

### 1. **User Action (e.g., Add URL, Delete, Favorite, etc.)**
   - User performs an action on the list
   - Action triggers API call (e.g., `POST /api/lists/[id]/urls`)

### 2. **Server-Side (API Route)**
   - API route processes the action
   - Creates activity record in database
   - Updates list in database
   - Publishes to Redis:
     - `CHANNELS.listActivity(listId)` → `{ type: "activity_created", activity: {...} }`
     - `CHANNELS.listUpdate(listId)` → `{ type: "list_updated", action: "..." }`

### 3. **SSE Server (`/api/realtime/list/[listId]/events/route.ts`)**
   - Polls Redis every 1 second for new messages
   - Sends messages to all connected clients as Server-Sent Events
   - Messages include both `activity_created` and `list_updated` events

### 4. **SSE Client Handler (`useRealtimeList.ts`)**
   - Receives SSE events from server
   - For **both** `activity_created` AND `list_updated` events:
     - Dispatches **single** `unified-update` event to window
     - Event includes: `{ listId, action, activity?, timestamp? }`
   - **Key Point:** One unified event instead of separate events

### 5. **Client Components Listen for Unified Event**

   #### **A. UrlList Component**
   - Listens for `unified-update` event
   - Gets slug from `currentList` store
   - Calls `fetchUnifiedUpdates(current.slug, 30)`
   - List store is automatically updated by the hook

   #### **B. ActivityFeed Component**
   - Listens for `unified-update` event
   - Gets slug from `currentList` store
   - Calls `fetchUnifiedUpdates(current.slug, limit)`
   - Also listens for `unified-activities-updated` event (dispatched by hook)
   - Updates activities state when event received

### 6. **Unified Hook (`useUnifiedListUpdates.ts`)**
   - **Global Lock:** Prevents duplicate API calls across all components
   - Checks if fetch is already in progress → skips if yes
   - Debounces: Only fetches if 200ms+ since last fetch
   - Calls unified endpoint: `GET /api/lists/[slug]/updates?activityLimit=30`
   - On success:
     - Updates `currentList.set(data.list)` → triggers UI re-render
     - Dispatches `unified-activities-updated` event with activities
   - **Key Point:** Only ONE API call happens even if multiple components listen

### 7. **Unified Endpoint (`/api/lists/[id]/updates/route.ts`)**
   - Receives slug as `[id]` parameter
   - Fetches list from database using `getListBySlug(slug)`
   - Fetches activities using `getActivitiesForList(listId, limit)`
   - Returns unified response:
     ```json
     {
       "list": { ... },
       "activities": [ ... ],
       "urlOrder": "...",
       "clickCounts": [ ... ]
     }
     ```

### 8. **UI Updates**
   - **List Store:** Updated automatically via `currentList.set(data.list)`
   - **Activity Feed:** Updated via `unified-activities-updated` event
   - Both components re-render with fresh data
   - **Result:** Everything updates in sync, ONE API call total

## Key Features

### ✅ **Single Source of Truth**
- One unified endpoint returns everything needed
- No separate `/api/lists/[id]` + `/api/lists/[id]/activities` calls
- Eliminates race conditions and inconsistencies

### ✅ **Global Lock Protection**
- Prevents duplicate API calls even if multiple components listen
- Debouncing ensures rapid events don't cause spam
- Only one fetch happens per action across all screens

### ✅ **Optimistic Updates Still Work**
- `activity-added` events still dispatched for instant UI feedback
- Unified endpoint ensures data consistency after optimistic update
- Best of both worlds: instant + consistent

### ✅ **Works Across All Screens**
- Owner screen, viewer screen, editor screen all get updates
- SSE ensures real-time sync
- One unified event triggers one unified API call

## Event Flow Diagram

```
Action → API Route → Redis → SSE Server → SSE Client
                                                    ↓
                                          unified-update event
                                                    ↓
                        ┌───────────────────────────┴───────────────────────────┐
                        ↓                                                       ↓
                   UrlList Component                                    ActivityFeed Component
                        ↓                                                       ↓
            fetchUnifiedUpdates(slug)                            fetchUnifiedUpdates(slug)
                        ↓                                                       ↓
                    ┌───┴───────────────────────────────────────────────────┐
                    │  Unified Hook (Global Lock - Only ONE call)          │
                    └───┬───────────────────────────────────────────────────┘
                        ↓
              GET /api/lists/[slug]/updates
                        ↓
              Returns: { list, activities }
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
  currentList.set(list)    unified-activities-updated event
        ↓                               ↓
   UI Re-renders                  ActivityFeed Updates
```

## Testing Checklist

- [ ] Add URL → Check both list and activity feed update
- [ ] Delete URL → Check both update
- [ ] Favorite/Unfavorite → Check both update
- [ ] Pin/Unpin → Check both update
- [ ] Archive/Restore → Check both update
- [ ] Edit URL → Check both update
- [ ] Add Comment → Check both update
- [ ] Change Visibility → Check both update
- [ ] Invite Collaborator → Check both update
- [ ] Multiple screens (owner + viewer) → Check both get updates
- [ ] Rapid actions → Check only ONE API call per action
- [ ] Network tab → Verify `/api/lists/[slug]/updates` is called, not separate endpoints

## Console Logs to Watch

- `🔄 [REALTIME]` - SSE events received
- `🔄 [UNIFIED]` - Unified endpoint fetch
- `✅ [UNIFIED]` - Unified fetch successful
- `📨 [ACTIVITIES]` - Activity feed updates
- `⏭️ [UNIFIED]` - Skipped duplicate (expected)

## Important Notes

1. **Slug vs UUID:** Unified endpoint uses `slug`, not UUID. Components get slug from `currentList` store.

2. **Initial Fetch:** ActivityFeed now uses unified endpoint on mount (with fallback to old endpoint if slug not available).

3. **Backward Compatibility:** Old `activity-updated` and `list-updated` listeners still exist but now dispatch `unified-update` instead.

4. **Global Lock:** The global lock in `useUnifiedListUpdates` ensures only ONE API call happens even if both UrlList and ActivityFeed trigger simultaneously.

