# 🧪 Testing Guide: Advanced Collaboration Features

This guide will help you test all the new collaboration features we've implemented.

## ✅ Features Implemented

1. **Real-time List Editing** - Updates sync across all connected clients
2. **Comments on URLs** - Add, edit, and delete comments on any URL
3. **Activity Feed** - See all activity in a list
4. **Role-based Permissions** - Owner, Editor, Viewer roles

---

## 🚀 Getting Started

### Prerequisites

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Ensure environment variables are set:**

   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - Database connection (`DATABASE_URL`)

3. **Database migrations applied:**

   ```bash
   npx prisma migrate dev
   ```

---

## 🧪 Test Scenarios

### Test 1: Real-time List Editing

**Goal:** Verify that URL changes sync across multiple browser tabs/windows.

**Setup:**

- **Option A (Easiest - Recommended):** Use the same account in two browser windows
  - Window 1: Normal browser (logged in)
  - Window 2: Incognito/Private window (log in with same account)
  - ✅ **No invitation needed!** Same user can test real-time sync
- **Option B:** Use two different accounts (requires inviting collaborator first)

**Steps:**

1. Open your app in two browser windows/tabs
   - **If using same account:** Normal browser + Incognito window (both logged in with same email)
   - **If using different accounts:** Both logged in with different emails (invite collaborator first)
2. Navigate to the same list in both windows
3. In Window 1:
   - Add a new URL
   - Delete a URL
   - Reorder URLs by dragging
4. In Window 2:
   - **Expected:** Changes should appear automatically within 2-3 seconds
   - The list should refresh and show the same state
   - No page refresh needed

**What to check:**

- ✅ Changes appear in real-time in other windows
- ✅ No page refresh required
- ✅ Console shows real-time connection messages

**Troubleshooting:**

- Check browser console for SSE connection errors
- Verify Redis is configured correctly
- Check network tab for `/api/realtime/list/[listId]/events` endpoint

---

### Test 2: Comments on URLs

**Goal:** Test commenting functionality on URLs.

**Steps:**

1. Navigate to any list with URLs
2. Click the **Comments** button (💬 icon) on any URL card
3. **Add a comment:**
   - Type a comment in the text area
   - Click "Post Comment"
   - **Expected:** Comment appears immediately
4. **Edit your comment:**
   - Click the edit icon (✏️) on your comment
   - Modify the text
   - Click "Save"
   - **Expected:** Comment updates, shows "(edited)" indicator
5. **Delete your comment:**
   - Click the delete icon (🗑️) on your comment
   - Confirm deletion
   - **Expected:** Comment disappears

**What to check:**

- ✅ Comments appear with user email and timestamp
- ✅ Only your own comments have edit/delete buttons
- ✅ Comments persist after page refresh
- ✅ Real-time updates work (try in two windows)

**Troubleshooting:**

- Verify user is logged in (comments require authentication)
- Check database for comment records in `comments` table
- Check API responses in network tab

---

### Test 3: Activity Feed

**Goal:** Verify activity tracking and display.

**Steps:**

1. Navigate to any list page
2. Scroll down to the **Activity Feed** section (below Collaborators)
3. Perform various actions:
   - Add a URL
   - Delete a URL
   - Edit a URL
   - Add a comment
   - Reorder URLs
4. **Expected:** Each action appears in the Activity Feed within 2-3 seconds

**What to check:**

- ✅ Activities show correct icons (green + for add, red trash for delete, etc.)
- ✅ Activities show user email
- ✅ Activities show correct action descriptions
- ✅ Timestamps are relative ("5m ago", "2h ago")
- ✅ Activities are in reverse chronological order (newest first)

**Troubleshooting:**

- Check database `activities` table for records
- Verify activity logging in API endpoints
- Check console for activity creation errors

---

### Test 4: Role-based Permissions

**Goal:** Test permission restrictions for different user roles.

**Setup:**

1. Create two user accounts:
   - User A: List owner (use your main account - e.g., Gmail)
   - User B: Collaborator (use your second account - e.g., Yahoo)
2. **Important:** You need to invite User B first:
   - Log in as User A (owner) in normal browser
   - Go to the list you want to test
   - Click "Invite Collaborator" button
   - Enter User B's email address (e.g., your Yahoo email)
   - User B will receive an email invitation
   - User B should accept (or just access the list - it should work automatically)
   - Now User B can log in and access the list as a collaborator

**Steps:**

**Test as Owner:**

1. Log in as User A (owner)
2. Navigate to your list
3. **Expected:** Can do everything:
   - ✅ Add/delete/edit URLs
   - ✅ Add comments
   - ✅ Invite collaborators
   - ✅ Delete list

**Test as Collaborator:**

1. Log in as User B (collaborator)
2. Navigate to the list you were invited to
3. **Expected:** Can do:
   - ✅ Add/delete/edit URLs
   - ✅ Add comments
   - ❌ Cannot invite collaborators
   - ❌ Cannot delete the list

**Test as Viewer (Public List):**

1. Log out
2. Navigate to a public list URL
3. **Expected:** Can do:
   - ✅ View URLs
   - ✅ Add comments (if authentication is optional)
   - ❌ Cannot add/delete/edit URLs
   - ❌ Cannot invite collaborators

**What to check:**

- ✅ Permission errors show appropriate messages
- ✅ UI elements are hidden/disabled based on permissions
- ✅ API endpoints return 403 Forbidden when needed

**Troubleshooting:**

- Check `getUserRole()` function logic
- Verify collaborator email matches exactly
- Check API responses for permission errors

---

### Test 5: Multi-User Collaboration

**Goal:** Test real-time collaboration between multiple users.

**Steps:**

1. Open the app in **Window 1** (User A - Owner)
2. Open the app in **Window 2** (User B - Collaborator)
3. Both navigate to the same list
4. In Window 1:
   - Add a URL
   - Add a comment
5. In Window 2:
   - **Expected:** See URL and comment appear automatically
6. In Window 2:
   - Add a different URL
   - Add a comment
7. In Window 1:
   - **Expected:** See changes appear automatically

**What to check:**

- ✅ Changes sync in real-time
- ✅ Activity feed updates for both users
- ✅ No conflicts or race conditions
- ✅ Comments show correct user attribution

---

## 🐛 Common Issues & Solutions

### Issue 1: Real-time updates not working

**Symptoms:**

- Changes don't sync across windows
- Console shows SSE connection errors

**Solutions:**

1. Check Redis connection:

   ```bash
   # Verify environment variables
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

2. Check browser console for SSE errors
3. Verify `/api/realtime/list/[listId]/events` endpoint is accessible
4. Check network tab - SSE connection should show status 200

### Issue 2: Comments not appearing

**Symptoms:**

- Comments don't save or don't appear after refresh

**Solutions:**

1. Check if user is logged in (comments require auth)
2. Verify database migration ran: `npx prisma migrate dev`
3. Check `comments` table in database
4. Verify API endpoint returns 200/201 status

### Issue 3: Activity feed empty

**Symptoms:**

- No activities showing even after performing actions

**Solutions:**

1. Check `activities` table in database
2. Verify activity creation in API logs
3. Check browser console for errors
4. Verify user has permission to view activities

### Issue 4: Permission errors

**Symptoms:**

- 403 Forbidden errors when trying to edit

**Solutions:**

1. Verify user is logged in
2. Check if user is owner/collaborator
3. Verify collaborator email matches exactly
4. Check `getUserRole()` function logic

---

## 📊 Database Verification

### Check Comments

```sql
SELECT * FROM comments ORDER BY created_at DESC LIMIT 10;
```

### Check Activities

```sql
SELECT * FROM activities ORDER BY created_at DESC LIMIT 10;
```

### Check List Permissions

```sql
SELECT id, title, user_id, collaborators, is_public FROM lists;
```

---

## 🎯 Manual Testing Checklist

- [ ] Real-time list editing works across multiple windows
- [ ] Comments can be added, edited, and deleted
- [ ] Comments show correct user attribution
- [ ] Activity feed displays all actions
- [ ] Activity feed updates in real-time
- [ ] Owner can do everything
- [ ] Collaborator can edit but not delete list
- [ ] Viewer (public) can only view
- [ ] Permission errors show appropriate messages
- [ ] All changes persist after page refresh

---

## 🚀 Next Steps

After testing, you can:

1. **Monitor performance** - Check Redis usage and API response times
2. **Add more activity types** - Track favorites, pins, etc.
3. **Enhance permissions** - Add role field to collaborators for Editor/Viewer distinction
4. **Add notifications** - Email notifications for mentions in comments
5. **Add reactions** - Like/react to comments

---

## 📝 Notes

- Real-time updates use Server-Sent Events (SSE) with polling every 2 seconds
- Activity logging is automatic for all URL operations
- Comments are scoped to URLs within lists
- Permissions are checked on every API request
- All real-time features work with existing Redis infrastructure

---

**Happy Testing! 🎉**
