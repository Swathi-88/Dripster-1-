import { supabase } from './supabase';
import { Conversation, Message } from '../types';

export class ChatService {
  private static instance: ChatService;
  private subscriptions: Map<string, any> = new Map();

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // Create or get existing conversation
  async getOrCreateConversation(itemId: string, ownerId: string, renterId: string): Promise<Conversation | null> {
    try {
      // First try to find existing conversation
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select(`
          *,
          item:clothing_items(id, title, images),
          owner:users(id, full_name, email),
          renter:users(id, full_name, email)
        `)
        .eq('item_id', itemId)
        .eq('owner_id', ownerId)
        .eq('renter_id', renterId)
        .single();

      if (existing && !findError) {
        return existing;
      }

      // Create new conversation if it doesn't exist
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          item_id: itemId,
          owner_id: ownerId,
          renter_id: renterId
        })
        .select(`
          *,
          item:clothing_items(id, title, images),
          owner:users(id, full_name, email),
          renter:users(id, full_name, email)
        `)
        .single();

      if (createError) throw createError;
      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  // Get user's conversations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          item:clothing_items(id, title, images),
          owner:users(id, full_name, email),
          renter:users(id, full_name, email),
          messages!inner(
            id,
            content,
            message_type,
            created_at,
            sender:users(id, full_name)
          )
        `)
        .or(`owner_id.eq.${userId},renter_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Process conversations to add last message and unread count
      const processedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users(id, full_name)
            `)
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { data: participant } = await supabase
            .from('conversation_participants')
            .select('last_read_at')
            .eq('conversation_id', conv.id)
            .eq('user_id', userId)
            .single();

          let unreadCount = 0;
          if (participant?.last_read_at) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', userId)
              .gt('created_at', participant.last_read_at);
            unreadCount = count || 0;
          }

          return {
            ...conv,
            last_message: lastMessage,
            unread_count: unreadCount
          };
        })
      );

      return processedConversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(id, full_name, email)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Send a message
  async sendMessage(conversationId: string, senderId: string, content: string, messageType: string = 'text', metadata: Record<string, any> = {}): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: messageType,
          metadata
        })
        .select(`
          *,
          sender:users(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  // Mark messages as read
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Subscribe to new messages in a conversation
  subscribeToMessages(conversationId: string, callback: (message: Message) => void): () => void {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users(id, full_name, email)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(conversationId, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(conversationId);
    };
  }

  // Subscribe to conversation updates
  subscribeToConversations(userId: string, callback: (conversation: Conversation) => void): () => void {
    const subscription = supabase
      .channel(`conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `or(owner_id.eq.${userId},renter_id.eq.${userId})`
        },
        async (payload) => {
          // Fetch the complete conversation with related data
          const { data } = await supabase
            .from('conversations')
            .select(`
              *,
              item:clothing_items(id, title, images),
              owner:users(id, full_name, email),
              renter:users(id, full_name, email)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  // Clean up all subscriptions
  cleanup(): void {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }
}