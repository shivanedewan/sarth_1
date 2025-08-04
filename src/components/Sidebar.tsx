'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Menu, X } from 'lucide-react';

export interface Conversation {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

export interface Message {
  id: string;
  content: string | { type: string; jobId: string; originalHtml: string };
  role: 'user' | 'assistant';
  timestamp: number;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  currentConversationId: string | null;
}

const Sidebar = ({
  isOpen,
  onToggle,
  conversations,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  currentConversationId,
}: SidebarProps) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 bg-gray-900 text-white z-60 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto w-80 flex flex-col`}
      >
        {/* Sidebar Content */}
        <div className="flex flex-col flex-1 bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
            <button
              onClick={onNewChat}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              <Plus size={16} />
              New Chat
            </button>
            <button
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-gray-700 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 bg-gray-900 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group relative flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                      currentConversationId === conversation.id
                        ? 'bg-gray-700'
                        : 'hover:bg-gray-800'
                    }`}
                    onClick={() => onSelectConversation(conversation)}
                  >
                    <MessageSquare size={16} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{conversation.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(conversation.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Bottom User Avatar/Settings */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg font-semibold text-white shadow">
            N
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium">Name</span>
            <span className="block text-xs text-gray-400">Settings</span>
          </div>
          {/* You can add a settings icon or menu here if desired */}
        </div>
      </div>
    </>
  );
};

export default Sidebar; 