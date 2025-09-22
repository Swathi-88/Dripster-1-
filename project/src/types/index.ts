export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

export interface ClothingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  size: string;
  price_per_day: number;
  images: string[];
  owner_id: string;
  available: boolean;
  created_at: string;
  updated_at: string;
  owner?: User;
}

export interface Rental {
  id: string;
  item_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  item?: ClothingItem;
  renter?: User;
  owner?: User;
}

export interface Conversation {
  id: string;
  item_id: string;
  owner_id: string;
  renter_id: string;
  rental_id?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  item?: ClothingItem;
  owner?: User;
  renter?: User;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'rental_request' | 'rental_update';
  metadata: Record<string, any>;
  read_by: Record<string, string>;
  created_at: string;
  sender?: User;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
}