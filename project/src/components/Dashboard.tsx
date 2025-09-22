import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { handleDatabaseError } from '../lib/supabase';
import { ClothingItem } from '../types';
import Header from './Header';
import ItemCard from './ItemCard';
import AddItemModal from './AddItemModal';
import ProfileModal from './ProfileModal';
import ChatModal from './ChatModal';
import { showToast } from './ui/Toast';
import { Plus, Search, Filter, MessageCircle } from 'lucide-react';

interface DashboardProps {
  session: Session;
}

const Dashboard = ({ session }: DashboardProps) => {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [initialChatConversationId, setInitialChatConversationId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = ['all', 'formal', 'casual', 'traditional', 'party', 'sports'];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clothing_items')
        .select(`
          *,
          owner:users(id, full_name, email)
        `)
        .eq('available', true)
        .order('created_at', { ascending: false });

      if (error) {
        const errorInfo = handleDatabaseError(error);
        if (errorInfo.isSchemaError) {
          console.warn(errorInfo.message);
          setItems([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setItems(data || []);
    } catch (error: any) {
      const errorInfo = handleDatabaseError(error);
      showToast(errorInfo.isSchemaError ? 
        'Database schema not set up. Please create the required tables in Supabase.' : 
        'Error loading items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenChat = (conversationId?: string) => {
    setInitialChatConversationId(conversationId);
    setShowChatModal(true);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Header 
        user={session.user} 
        onProfileClick={() => setShowProfileModal(true)}
        onChatClick={() => handleOpenChat()}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clothing items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Item
              </button>
              
              <button
                onClick={() => handleOpenChat()}
                className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200"
              >
                <MessageCircle className="h-5 w-5" />
                Messages
              </button>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm animate-pulse">
                <div className="w-full h-64 bg-gray-200 rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ItemCard 
                key={item.id} 
                item={item} 
                currentUserId={session.user.id}
                onUpdate={fetchItems}
                onOpenChat={handleOpenChat}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Be the first to add a clothing item!'
              }
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-colors"
            >
              Add Your First Item
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddItemModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={fetchItems}
          userId={session.user.id}
        />
      )}

      {showProfileModal && (
        <ProfileModal 
          user={session.user}
          onClose={() => setShowProfileModal(false)} 
        />
      )}

      {showChatModal && (
        <ChatModal
          onClose={() => {
            setShowChatModal(false);
            setInitialChatConversationId(undefined);
          }}
          userId={session.user.id}
          initialConversationId={initialChatConversationId}
        />
      )}
    </div>
  );
};

export default Dashboard;