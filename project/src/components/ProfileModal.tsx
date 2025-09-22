import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from './ui/Toast';
import { X, User, Mail, Phone, Edit2, Save, Calendar } from 'lucide-react';
import { ClothingItem, Rental } from '../types';

interface ProfileModalProps {
  user: any;
  onClose: () => void;
}

const ProfileModal = ({ user, onClose }: ProfileModalProps) => {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [myItems, setMyItems] = useState<ClothingItem[]>([]);
  const [myRentals, setMyRentals] = useState<Rental[]>([]);
  const [activeTab, setActiveTab] = useState('items');
  const [profile, setProfile] = useState({
    full_name: user.user_metadata?.full_name || '',
    phone: user.user_metadata?.phone || '',
  });

  useEffect(() => {
    fetchUserData();
  }, [user.id]);

  const fetchUserData = async () => {
    try {
      // Fetch user's items
      const { data: items, error: itemsError } = await supabase
        .from('clothing_items')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      setMyItems(items || []);

      // Fetch user's rentals
      const { data: rentals, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
          *,
          item:clothing_items(id, title, images),
          owner:users(full_name)
        `)
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });

      if (rentalsError) throw rentalsError;
      setMyRentals(rentals || []);
    } catch (error: any) {
      showToast('Error loading profile data', 'error');
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: profile
      });

      if (error) throw error;
      
      showToast('Profile updated successfully!', 'success');
      setEditing(false);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'confirmed': return 'text-blue-600 bg-blue-50';
      case 'active': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-gray-600 bg-gray-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-4">
              <span className="text-white text-2xl font-bold">
                {profile.full_name?.[0] || user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              {editing ? (
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  className="text-xl font-semibold bg-transparent border-b border-gray-300 focus:outline-none focus:border-orange-500"
                  placeholder="Full Name"
                />
              ) : (
                <h3 className="text-xl font-semibold text-gray-900">
                  {profile.full_name || 'No name set'}
                </h3>
              )}
              <p className="text-gray-600">{user.email}</p>
            </div>
            <button
              onClick={() => editing ? handleUpdateProfile() : setEditing(true)}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {editing ? (
                <Save className="h-5 w-5 text-green-600" />
              ) : (
                <Edit2 className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Phone className="h-4 w-4 mr-2" />
              {editing ? (
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className="text-sm bg-transparent border-b border-gray-300 focus:outline-none focus:border-orange-500 flex-1"
                  placeholder="Phone number"
                />
              ) : (
                <span className="text-sm">{profile.phone || 'No phone number'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('items')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'items'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Items ({myItems.length})
            </button>
            <button
              onClick={() => setActiveTab('rentals')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'rentals'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Rentals ({myRentals.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'items' ? (
            <div className="space-y-4">
              {myItems.length > 0 ? (
                myItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">👕</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.category} • Size {item.size}</p>
                      <p className="text-sm font-medium text-green-600">₹{item.price_per_day}/day</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      item.available 
                        ? 'text-green-600 bg-green-50' 
                        : 'text-red-600 bg-red-50'
                    }`}>
                      {item.available ? 'Available' : 'Rented'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No items listed yet</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {myRentals.length > 0 ? (
                myRentals.map((rental) => (
                  <div key={rental.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">👕</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{rental.item?.title}</h4>
                      <p className="text-sm text-gray-600">
                        Owner: {rental.owner?.full_name}
                      </p>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(rental.status)}`}>
                        {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                      </div>
                      <p className="text-sm font-medium text-green-600 mt-1">
                        ₹{rental.total_price}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No rental history yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;