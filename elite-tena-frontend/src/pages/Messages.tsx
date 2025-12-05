import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../lib/axios';
import { Chat } from '../components/Chat';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  other_user: string;
  last_message_content: string;
  last_message_time: string;
  unread_count: number;
  email: string;
  profileData?: {
    fullName?: string;
  };
  role?: string;
}

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user?.walletAddress) return;

    setLoading(true);
    try {
      const response = await axios.get(`/chat/conversations/${user.walletAddress}`);
      if (response.data.success) {
        setConversations(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.profileData?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Conversation List */}
      <div className="w-full md:w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-medical-600" />
            Messages
          </h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-medical-500" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-center">
                {searchTerm ? 'No conversations found' : 'No messages yet'}
              </p>
              <p className="text-sm text-center mt-2">
                Start a conversation from an appointment
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conv) => (
                <motion.div
                  key={conv.other_user}
                  whileHover={{ backgroundColor: '#f9fafb' }}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedConversation?.other_user === conv.other_user
                      ? 'bg-medical-50 border-l-4 border-medical-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {conv.profileData?.fullName || conv.email}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{conv.role}</p>
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true })}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="mt-1 bg-medical-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conv.last_message_content}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 hidden md:flex flex-col">
        {selectedConversation ? (
          <Chat
            otherUserWallet={selectedConversation.other_user}
            otherUserName={selectedConversation.profileData?.fullName || selectedConversation.email}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="w-24 h-24 mb-4 opacity-20" />
            <p className="text-xl font-semibold">Select a conversation</p>
            <p className="text-sm mt-2">Choose a conversation from the list to start chatting</p>
          </div>
        )}
      </div>

      {/* Mobile: Full-screen chat when selected */}
      {selectedConversation && (
        <div className="md:hidden fixed inset-0 bg-white z-50">
          <Chat
            otherUserWallet={selectedConversation.other_user}
            otherUserName={selectedConversation.profileData?.fullName || selectedConversation.email}
          />
          <button
            onClick={() => setSelectedConversation(null)}
            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-lg"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};
