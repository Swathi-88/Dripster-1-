import React, { useState } from 'react';
import { ClothingItem } from '../types';
import { Calendar, DollarSign, User, Heart, MessageCircle } from 'lucide-react';
import { getImageUrl } from '../lib/supabase';
import RentItemModal from './RentItemModal';
import { ChatService } from '../lib/chat';
import { showToast } from './ui/Toast';

interface ItemCardProps {
  item: ClothingItem;
  currentUserId: string;
  onUpdate: () => void;
  onOpenChat?: (conversationId: string) => void;
}

const ItemCard = ({ item, currentUserId, onUpdate, onOpenChat }: ItemCardProps) => {
  const [showRentModal, setShowRentModal] = useState(false);
  const [liked, setLiked] = useState(false);

  const isOwner = item.owner_id === currentUserId;
  const primaryImage = item.images?.[0];
  const chatService = ChatService.getInstance();

  const handleStartChat = async () => {
    if (isOwner) return;
    
    try {
      const conversation = await chatService.getOrCreateConversation(
        item.id,
        item.owner_id,
        currentUserId
      );
      
      if (conversation && onOpenChat) {
        onOpenChat(conversation.id);
      } else {
        showToast('Unable to start chat', 'error');
      }
    } catch (error) {
      showToast('Error starting chat', 'error');
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
        {/* Image Section */}
        <div className="relative aspect-[4/5] overflow-hidden">
          {primaryImage ? (
            <img
              src={getImageUrl(primaryImage)}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src = `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=500&fit=crop&crop=center`;
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-4xl">👕</span>
            </div>
          )}
          
          {/* Overlay Actions */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                liked 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
              }`}
            >
              <Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              {item.category}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
            {item.title}
          </h3>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {item.description}
          </p>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center text-sm text-gray-500">
              <User className="h-4 w-4 mr-1" />
              Size {item.size}
            </div>
            
            <div className="flex items-center text-sm font-semibold text-green-600">
              <DollarSign className="h-4 w-4" />
              {item.price_per_day}/day
            </div>
          </div>

          {/* Owner Info */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-orange-600 text-xs font-medium">
                  {item.owner?.full_name?.[0] || 'U'}
                </span>
              </div>
              <span>{item.owner?.full_name || 'User'}</span>
            </div>

            <div className="flex gap-2">
              {!isOwner && (
                <button
                  onClick={() => setShowRentModal(true)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-orange-600 hover:to-red-600 transition-colors flex items-center gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  Rent
                </button>
              )}
              
              <button 
                onClick={handleStartChat}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Start chat"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rent Modal */}
      {showRentModal && (
        <RentItemModal
          item={item}
          onClose={() => setShowRentModal(false)}
          onSuccess={() => {
            setShowRentModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
};

export default ItemCard;