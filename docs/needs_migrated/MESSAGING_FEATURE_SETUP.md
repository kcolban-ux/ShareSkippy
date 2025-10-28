# Messaging Feature Setup

This document explains how to set up and use the new messaging feature that allows users to send messages to availability post owners.

## Features

- **Send Message Button**: Added to availability posts on the community page
- **Message Modal**: Popup interface for composing and sending messages
- **Messages Page**: Full messaging interface at `/messages`
- **Conversation Management**: Automatic conversation creation and management
- **Real-time Updates**: Messages appear immediately after sending

## Database Setup

The messaging feature requires the following database tables and policies:

### Tables

1. **messages** - Stores individual messages
2. **conversations** - Groups messages between users for specific availability posts

### Row Level Security (RLS) Policies

The following policies need to be applied to your Supabase database:

```sql
-- Enable RLS for messages and conversations tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can update conversations they participate in" ON conversations
  FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
```

## Components

### MessageModal.js

A reusable modal component for sending messages to availability post owners.

**Props:**

- `isOpen` - Boolean to control modal visibility
- `onClose` - Function to close the modal
- `recipient` - User object of the message recipient
- `availabilityPost` - Availability post object for context

**Features:**

- Auto-generates subject line based on availability post
- Shows recipient information and post context
- Form validation and error handling
- Success feedback

### Community Page Updates

The community page now includes:

- "Send Message" buttons next to "View Details" buttons
- Message modal integration
- Proper user authentication checks (users can't message themselves)

### Messages Page

A comprehensive messaging interface at `/messages` featuring:

- Conversations sidebar showing all user conversations
- Message thread view with real-time updates
- Message composition and sending
- User profile photos and names
- Timestamp formatting

## Usage

### For Users

1. **Sending Messages**: Click "Send Message" on any availability post in the community
2. **Viewing Messages**: Navigate to `/messages` to see all conversations
3. **Replying**: Click on a conversation to view and reply to messages

### For Developers

1. **Adding Message Buttons**: Use the `openMessageModal` function with recipient and post data
2. **Customizing Modals**: Modify `MessageModal.js` for different use cases
3. **API Integration**: Use the `/api/messages` endpoint for server-side message handling

## Security Features

- **Authentication Required**: Users must be logged in to send/receive messages
- **Row Level Security**: Database policies ensure users only see their own messages
- **Input Validation**: Message content is validated before sending
- **User Isolation**: Users cannot message themselves

## Future Enhancements

- **Real-time Notifications**: Push notifications for new messages
- **Message Status**: Read receipts and delivery confirmations
- **File Attachments**: Support for images and documents
- **Group Conversations**: Multi-user messaging for events
- **Message Search**: Search through conversation history

## Troubleshooting

### Common Issues

1. **Messages not appearing**: Check RLS policies are properly applied
2. **Modal not opening**: Verify user authentication and recipient data
3. **Database errors**: Ensure all required tables exist with correct schemas

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify Supabase connection and authentication
3. Test database policies with direct queries
4. Check user permissions and role assignments

## API Endpoints

### POST /api/messages

Send a new message

**Body:**

```json
{
  "recipient_id": "uuid",
  "availability_id": "uuid",
  "subject": "string",
  "content": "string"
}
```

### GET /api/messages?conversation_id=uuid

Fetch messages for a specific conversation

**Response:**

```json
{
  "messages": [
    {
      "id": "uuid",
      "content": "string",
      "created_at": "timestamp",
      "sender": {
        "id": "uuid",
        "first_name": "string",
        "last_name": "string"
      }
    }
  ]
}
```
