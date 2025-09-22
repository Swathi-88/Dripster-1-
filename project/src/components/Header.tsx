import React from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from './ui/Toast';
import { User, LogOut, MessageCircle } from 'lucide-react';

interface HeaderProps {
  user: any;
  onProfileClick: () => void;
  onChatClick?: () => void;
}

const Header = ({ user, onProfileClick, onChatClick }: HeaderProps) => {
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showToast('Signed out successfully', 'success');
    } catch (error: any) {
      showToast('Error signing out', 'error');
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-lg font-bold">D</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">DRIPSTER</h1>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </span>
            
            <button
              onClick={onProfileClick}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Profile"
            >
              <User className="h-5 w-5" />
            </button>
           
           {onChatClick && (
             <button
               onClick={onChatClick}
               className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
               title="Messages"
             >
               <MessageCircle className="h-5 w-5" />
             </button>
           )}
            
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;