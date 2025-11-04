# Messaging Improvements

## Overview

This project enhances the messaging page (`/messages`) with four key improvements: message reactions (thumbs up, thumbs down, heart), date display in message timestamps, unread message indicators in the conversations list, and clickable profile links that navigate to user profiles/availability posts.

### Goals

- Add reaction buttons (thumbs up, thumbs down, heart) to messages that allow users to react to messages
- Display both date and time in message timestamps (currently only shows time)
- Show unread message indicators (badge/symbol) next to conversations with unread messages in the conversations list
- Make profile photos and names clickable in conversations list and message header, linking to the user's profile page (`/profile/[id]`) where users can view profile information, dogs, and reviews

### Constraints

- Must maintain existing messaging functionality and user experience
- Must follow existing codebase patterns for database queries, API routes, and React components
- Must use existing Supabase database schema and RLS policies where possible
- Must maintain responsive design and mobile-friendly interface
- Must integrate with existing real-time subscription system for messages
- Must use existing authentication system (Supabase Auth)
- Must follow existing UI design patterns and color scheme (purple primary, warm teal secondary, coral accent)
- Must ensure all database changes are backward compatible
- Must handle edge cases (e.g., deleted users, missing profile photos)
- Must maintain performance for users with many conversations
- Must use existing Next.js routing patterns for profile navigation

### Non-Goals

- Not implementing a notification system for reactions (reactions are passive)
- Not implementing reaction counts or analytics
- Not implementing custom emoji reactions beyond the three specified (thumbs up, thumbs down, heart)
- Not implementing message editing or deletion improvements
- Not implementing read receipts beyond unread indicators
- Not implementing message search or filtering
- Not modifying the availability post viewing experience (only profile navigation)

## Preparation

### Information Gathering

**Current Messaging Implementation:**
- Messages are stored in the `messages` table with fields: `id`, `sender_id`, `recipient_id`, `availability_id`, `conversation_id`, `subject`, `content`, `is_read`, `created_at`, `updated_at`
- The `is_read` field exists but is not currently used for unread indicators
- Messages are fetched using participant IDs, not conversation_id (fetchMessages function uses `.or()` with participant IDs)
- Timestamps are formatted with `formatTime()` which only shows time (e.g., "8:41 PM")
- A `formatDate()` function exists but is only used for conversation list, not individual messages
- Profile navigation uses Next.js `Link` component with pattern `/profile/[id]`
- Real-time updates are handled via Supabase channels

**Database Migration Pattern:**
- Migrations are stored in `supabase/migrations/` directory
- Migration files are named with date prefix: `YYYYMMDDHHMMSS_description.sql`
- Database schema documentation is in `database_schema.sql`

**UI Patterns:**
- Uses Tailwind CSS for styling
- Color scheme: purple primary, warm teal secondary, coral accent
- Input fields have white backgrounds
- Uses Next.js `Link` component for client-side navigation

### Design Decisions

**Message Reactions System:**
- Create a new `message_reactions` table with schema:
  - `id` (UUID, primary key)
  - `message_id` (UUID, foreign key to messages)
  - `user_id` (UUID, foreign key to profiles)
  - `reaction_type` (TEXT, CHECK constraint: 'thumbs_up', 'thumbs_down', 'heart')
  - `created_at` (TIMESTAMP WITH TIME ZONE)
  - Unique constraint on `(message_id, user_id, reaction_type)` to prevent duplicate reactions
  - Index on `message_id` for efficient querying
- Users can add or remove reactions (toggle behavior)
- Reactions are displayed below each message bubble
- Store reaction counts per message for display (computed via aggregation queries)
- API endpoint: `/api/messages/reactions` to handle POST (add) and DELETE (remove) operations

**Unread Message Indicators:**
- Use existing `is_read` field in messages table
- When a conversation is selected and messages are loaded, mark all messages in that conversation as read for the current user (where recipient_id = current user)
- Query unread message count per conversation when fetching conversations list
- Display unread count as a badge (e.g., red dot with count number) next to conversation name in sidebar
- Update unread counts in real-time via Supabase subscriptions
- Mark messages as read when:
  - User opens a conversation (when selectedConversation changes)
  - User views messages in a conversation (when messages are fetched)

**Timestamp Display:**
- Combine `formatDate()` and `formatTime()` functions to show both date and time
- Format: "Today, 8:41 PM" or "Yesterday, 8:41 PM" or "Oct 27, 8:41 PM" or "Monday, 8:41 PM"
- Use existing `formatDate()` logic but append time to the output
- Update message timestamp display in the message bubble component

**Profile Navigation Links:**
- Wrap profile photos and names in Next.js `Link` components pointing to `/profile/[id]`
- Apply to:
  - Conversation list items (profile photo and name)
  - Message thread header (profile photo and name)
- Ensure links don't interfere with conversation selection click behavior
- Use `onClick` handler to prevent event propagation when clicking on profile link vs. conversation selection
- Maintain existing styling and hover effects

### Architecture Decisions

**Reactions API Design:**
- Create `/api/messages/reactions/route.js` with:
  - POST: Add or toggle reaction (if exists, remove; if not exists, add)
  - GET: Fetch reactions for a message or set of messages
- Reactions are stored per user per message per reaction type
- Real-time updates via Supabase channel subscriptions on `message_reactions` table

**Unread Tracking:**
- Add API endpoint `/api/messages/mark-read` to bulk update messages as read
- Update `fetchMessages` to mark messages as read when conversation is opened
- Add unread count to conversation query: `SELECT COUNT(*) FROM messages WHERE conversation_id = X AND recipient_id = Y AND is_read = false`
- Include unread count in conversations list query response

**Real-time Updates:**
- Subscribe to `message_reactions` table changes for reaction updates
- Subscribe to `messages` table changes for unread count updates
- Use existing Supabase channel pattern from messages page

**Database Migration:**
- Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_add_message_reactions.sql`
- Migration should:
  - Create `message_reactions` table
  - Add indexes for performance
  - Enable RLS and create policies
  - Add foreign key constraints

### Edge Cases and Considerations

**Reactions:**
- Handle users who have deleted their profile (reactions should still display but show "Unknown User")
- Prevent reaction spam (already handled by unique constraint)
- Handle concurrent reaction toggles (database constraint ensures consistency)

**Unread Indicators:**
- Handle messages from deleted users gracefully
- Update unread counts when messages are deleted
- Handle edge case where conversation has no messages
- Ensure unread counts are accurate after marking messages as read

**Profile Links:**
- Handle missing profile photos (show default avatar)
- Handle deleted user profiles (show error or redirect)
- Ensure mobile responsiveness is maintained

**Performance:**
- Reactions query should use aggregation to avoid N+1 queries
- Unread counts should be computed efficiently (consider caching or materialized view)
- Profile link clicks should not cause unnecessary re-renders

### Implementation Order

1. **Phase 1: Profile Navigation Links** (Simplest, no database changes)
   - Add Link components to profile photos and names
   - Test navigation behavior

2. **Phase 2: Timestamp Date Display** (Simple UI change)
   - Update formatTime/formatDate functions
   - Update message display component

3. **Phase 3: Unread Message Indicators** (Uses existing database field)
   - Create mark-read API endpoint
   - Update conversations query to include unread counts
   - Add UI indicators in conversations list
   - Implement real-time updates

## Implementation Log

### Phase 1: Profile Navigation Links

**Coding Tasks:**
- [ ] Wrap profile photo and name in conversation list items with Next.js Link component pointing to `/profile/[id]` using `otherParticipant.id`
- [ ] Wrap profile photo and name in message thread header with Next.js Link component pointing to `/profile/[id]` using `selectedConversation.otherParticipant.id`
- [ ] Add `onClick` handler with `e.stopPropagation()` to profile links in conversation list to prevent conversation selection when clicking profile link
- [ ] Add `onClick` handler with `e.stopPropagation()` to profile links in message header to prevent any unintended behavior
- [ ] Ensure Link components maintain existing styling and hover effects (no visual changes except clickability)
- [ ] Test that clicking profile photo/name navigates to profile page while clicking elsewhere on conversation item still selects conversation
- [ ] Verify mobile responsiveness is maintained for profile links

**QA Tasks:**
- [ ] **For user:** Click on profile photos and names in conversations list and verify navigation to profile pages works correctly
- [ ] **For user:** Click on profile photos and names in message thread header and verify navigation to profile pages works correctly
- [ ] **For user:** Verify that clicking on profile links doesn't interfere with conversation selection behavior
- [ ] **For user:** Test on mobile devices to ensure profile links are easily clickable and navigation works

### Phase 2: Timestamp Date Display

**Coding Tasks:**
- [ ] Create new `formatTimestamp` function in `app/messages/page.js` that combines `formatDate` and `formatTime` logic to show both date and time
- [ ] Update `formatTimestamp` to return format: "Today, 8:41 PM" or "Yesterday, 8:41 PM" or "Monday, 8:41 PM" or "Oct 27, 8:41 PM" (use existing `formatDate` logic and append time)
- [ ] Replace `formatTime(message.created_at)` call in message bubble with `formatTimestamp(message.created_at)`
- [ ] Verify timestamp display shows both date and time correctly for messages from today, yesterday, this week, and older dates
- [ ] Ensure timestamp styling and positioning remain unchanged (only text content changes)

**QA Tasks:**
- [ ] **For user:** Verify message timestamps show both date and time (e.g., "Today, 8:41 PM" or "Oct 27, 8:41 PM")
- [ ] **For user:** Check that timestamps display correctly for messages from different dates (today, yesterday, this week, older)
- [ ] **For user:** Verify timestamp styling and appearance matches existing design

### Phase 3: Unread Message Indicators

**Coding Tasks:**
- [ ] Create API endpoint `/api/messages/mark-read/route.js` that accepts conversation_id and marks all unread messages in that conversation as read for the current user (where recipient_id = current user)
- [ ] Update `fetchMessages` function in `app/messages/page.js` to call mark-read API after successfully fetching messages
- [ ] Modify `fetchConversations` function to include unread message count per conversation by adding a subquery or join that counts unread messages (where recipient_id = current user AND is_read = false AND conversation matches)
- [ ] Add `unreadCount` field to processed conversation objects in `fetchConversations`
- [ ] Display unread count badge (red dot with number) next to conversation name in conversations list when `unreadCount > 0`
- [ ] Style unread badge to be visually distinct (red background, white text, circular badge) and positioned appropriately next to conversation name
- [ ] Add real-time subscription to `messages` table changes to update unread counts when new messages arrive
- [ ] Update unread count in conversations list when messages are marked as read or new messages arrive
- [ ] Handle edge case where conversation has no messages (unreadCount should be 0)
- [ ] Ensure unread counts are cleared when conversation is selected and messages are marked as read

**QA Tasks:**
- [ ] **For user:** Verify unread message badges appear next to conversations with unread messages
- [ ] **For user:** Check that unread count decreases when messages are read after opening a conversation
- [ ] **For user:** Verify unread badges update in real-time when new messages arrive
- [ ] **For user:** Test that unread counts are accurate after marking messages as read
- [ ] **For user:** Verify unread badge styling is clear and visible but doesn't interfere with conversation list layout