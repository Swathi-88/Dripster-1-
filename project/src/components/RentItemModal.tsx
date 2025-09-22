import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClothingItem } from '../types';
import { showToast } from './ui/Toast';
import { X, Calendar, DollarSign, User } from 'lucide-react';
import { getImageUrl } from '../lib/supabase';
import { ChatService } from '../lib/chat';

interface RentItemModalProps {
  item: ClothingItem;
  onClose: () => void;
  onSuccess: () => void;
}

const RentItemModal = ({ item, onClose, onSuccess }: RentItemModalProps) => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const chatService = ChatService.getInstance();

  const calculatePrice = (start: string, end: string) => {
    if (start && end) {
      const startD = new Date(start);
      const endD = new Date(end);
      const days = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        setTotalPrice(days * item.price_per_day);
        return;
      }
    }
    setTotalPrice(0);
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    calculatePrice(date, endDate);
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    calculatePrice(startDate, date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (totalPrice <= 0) {
        showToast('Please select valid dates', 'error');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('rentals')
        .insert({
          item_id: item.id,
          renter_id: user.id,
          owner_id: item.owner_id,
          start_date: startDate,
          end_date: endDate,
          total_price: totalPrice,
          status: 'pending'
        });

      if (error) throw error;

      // Create or get conversation and send initial message
      try {
        const conversation = await chatService.getOrCreateConversation(
          item.id,
          item.owner_id,
          user.id
        );
        
        if (conversation) {
          await chatService.sendMessage(
            conversation.id,
            user.id,
            `Hi! I'd like to rent your "${item.title}" from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Total: ₹${totalPrice}`,
            'rental_request',
            {
              rental_details: {
                start_date: startDate,
                end_date: endDate,
                total_price: totalPrice
              }
            }
          );
        }
      } catch (chatError) {
        console.error('Error creating chat:', chatError);
        // Don't fail the rental request if chat creation fails
      }

      showToast('Rental request sent successfully!', 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Rent Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Item Preview */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden">
              {item.images?.[0] ? (
                <img
                  src={getImageUrl(item.images[0])}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">👕</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600">Size {item.size}</p>
              <p className="text-sm font-medium text-green-600">
                ₹{item.price_per_day}/day
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  min={today}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Price Summary */}
            {totalPrice > 0 && (
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Days:</span>
                  <span className="font-medium">
                    {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Rate per day:</span>
                  <span className="font-medium">₹{item.price_per_day}</span>
                </div>
                <hr className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Total Amount:</span>
                  <span className="font-bold text-green-600 text-lg">₹{totalPrice}</span>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Owner Contact</h4>
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2" />
                <span>{item.owner?.full_name || 'Owner'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Contact details will be shared after confirmation
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || totalPrice <= 0}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RentItemModal;