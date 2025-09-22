/*
  # Add Real-time Chat System

  1. New Tables
    - `conversations` - stores chat conversations between users
    - `messages` - stores individual chat messages
    - `conversation_participants` - manages who can access each conversation

  2. Security
    - Enable RLS on all chat tables
    - Add policies for participants to access their conversations
    - Add policies for sending and receiving messages

  3. Real-time Features
    - Enable real-time subscriptions for messages
    - Auto-create conversations when rental requests are made
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES clothing_items(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rental_id uuid REFERENCES rentals(id) ON DELETE SET NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, owner_id, renter_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'rental_request', 'rental_update')),
  metadata jsonb DEFAULT '{}',
  read_by jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create conversation participants table for easier querying
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = renter_id);

CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = renter_id);

CREATE POLICY "Participants can update conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = renter_id);

-- Policies for messages
CREATE POLICY "Participants can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND (owner_id = auth.uid() OR renter_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND (owner_id = auth.uid() OR renter_id = auth.uid())
    )
  );

CREATE POLICY "Senders can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Policies for conversation participants
CREATE POLICY "Users can view their participations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join conversations they're part of"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND (owner_id = auth.uid() OR renter_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own participation"
  ON conversation_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation when new message is added
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON messages;
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to auto-create conversation participants
CREATE OR REPLACE FUNCTION create_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Add owner as participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  -- Add renter as participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (NEW.id, NEW.renter_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create participants when conversation is created
DROP TRIGGER IF EXISTS create_conversation_participants_trigger ON conversations;
CREATE TRIGGER create_conversation_participants_trigger
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_participants();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_renter_id ON conversations(renter_id);
CREATE INDEX IF NOT EXISTS idx_conversations_item_id ON conversations(item_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);