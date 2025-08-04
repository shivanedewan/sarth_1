import { useState, useEffect } from 'react';
import { Conversation, Message } from '@/components/Sidebar';

const STORAGE_KEY = 'chatgpt-conversations';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Conversation[];
        const seenIds = new Set<string>();
        const uniqueConversations = parsed.map(conv => {
          if (seenIds.has(conv.id)) {
            return { ...conv, id: generateId() };
          }
          seenIds.add(conv.id);
          return conv;
        });
        setConversations(uniqueConversations);
      } catch (error) {
        console.error('Failed to parse stored conversations:', error);
      }
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: generateId(),
      title: 'New Chat',
      timestamp: Date.now(),
      messages: [],
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    return newConversation;
  };

  // <-- Removed the stray triple-quotes here -->
  const addMessageToConversation = (
    conversationId: string,
    message: Omit<Message, 'id' | 'timestamp'>
  ) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };

    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedMessages = [...conv.messages, newMessage];
          let title = conv.title;
          if (message.role === 'user' && conv.messages.length === 0) {
            if (typeof message.content === 'string') {
              title =
                message.content.slice(0, 50) +
                (message.content.length > 50 ? '...' : '');
            } else {
              title = 'Grammar Correction';
            }
          }
          return { ...conv, title, messages: updatedMessages };
        }
        return conv;
      })
    );
    return newMessage;
  };

  const updateLastMessage = (conversationId: string, newContent: string) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          const lastMessage = conv.messages[conv.messages.length - 1];
          if (lastMessage) {
            const updatedMessages = [
              ...conv.messages.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + newContent },
            ];
            return { ...conv, messages: updatedMessages };
          }
        }
        return conv;
      })
    );
  };

  const overwriteLastMessage = (conversationId: string, newContent: string) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          const lastMessage = conv.messages[conv.messages.length - 1];
          if (lastMessage) {
            const updatedMessages = [
              ...conv.messages.slice(0, -1),
              { ...lastMessage, content: newContent },
            ];
            return { ...conv, messages: updatedMessages };
          }
        }
        return conv;
      })
    );
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }
  };

  const getCurrentConversation = () =>
    conversations.find(conv => conv.id === currentConversationId) || null;

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
  };

  const clearCurrentConversation = () => {
    setCurrentConversationId(null);
  };

  return {
    conversations,
    currentConversationId,
    currentConversation: getCurrentConversation(),
    createNewConversation,
    addMessageToConversation,
    updateLastMessage,
    overwriteLastMessage,
    deleteConversation,
    selectConversation,
    clearCurrentConversation,
  };
};
