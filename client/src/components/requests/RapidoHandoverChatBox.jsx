import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Phone,
  Sparkles,
  Lock,
  PackageCheck
} from 'lucide-react';
import Button from '../common/Button';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { messageService } from '../../services/messageService';
import { requestService } from '../../services/requestService';
import socketService from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';

/**
 * RapidoHandoverChatBox
 * Ephemeral trip/order-style coordination chatbox for item pickup and handover.
 * Once the item is marked as "Taken", the chatbox permanently closes
 * and wipes all conversation messages from the database.
 */
export const RapidoHandoverChatBox = ({
  request,
  onRequestUpdated
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTakenModalOpen, setIsTakenModalOpen] = useState(false);
  const [markingTaken, setMarkingTaken] = useState(false);
  const [isTaken, setIsTaken] = useState(request?.status === 'COMPLETED');

  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);

  const currentUserId = user?.id || user?._id;
  const isOwner = (request?.owner?._id || request?.owner?.id || request?.owner) === currentUserId;
  const isRequester = (request?.requester?._id || request?.requester?.id || request?.requester) === currentUserId;
  const partner = isOwner ? request?.requester : request?.owner;

  // Determine partner location text
  const partnerLocation = isOwner
    ? request?.handoverLocation?.city || request?.requester?.locality || request?.requester?.city || 'Nearby Location'
    : request?.item?.location?.city || request?.item?.location?.locality || request?.owner?.city || 'Item Pickup Point';

  const partnerPhone = partner?.phone || '';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversation and messages
  const loadConversationAndMessages = useCallback(async () => {
    if (!request?._id) return;
    try {
      const convRes = await messageService.getConversationByRequest(request._id);
      if (convRes?.isTaken || convRes?.closed) {
        setIsTaken(true);
        setConversation(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      if (convRes?.conversationId || convRes?.conversation?._id) {
        const convId = convRes.conversationId || convRes.conversation._id;
        setConversation(convRes.conversation || { _id: convId });

        // Fetch messages
        const msgRes = await messageService.getMessages(convId);
        if (msgRes?.messages) {
          setMessages(msgRes.messages);
        }

        // Join socket room
        socketService.joinConversation(convId);
      }
    } catch (err) {
      console.warn('[HandoverChat] Failed to load conversation:', err.message);
    } finally {
      setLoading(false);
    }
  }, [request?._id]);

  useEffect(() => {
    if (request?.status === 'COMPLETED') {
      setIsTaken(true);
      setLoading(false);
      return;
    }

    loadConversationAndMessages();

    // Listen for new messages & item taken events via Socket
    const handleNewMessage = (msg) => {
      if (!msg) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id || m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(scrollToBottom, 100);
    };

    const handleItemTaken = () => {
      setIsTaken(true);
      setMessages([]);
      setConversation(null);
      addToast({
        title: 'Item Taken!',
        message: 'The item has been marked as taken. This chat has been permanently closed and deleted from the database.',
        variant: 'info'
      });
      if (onRequestUpdated) onRequestUpdated();
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('item_taken', handleItemTaken);
    socketService.on('chat_closed_item_taken', handleItemTaken);

    // Light polling fallback every 6 seconds to ensure reliable messaging
    pollTimerRef.current = setInterval(() => {
      if (conversation?._id && !isTaken) {
        messageService.getMessages(conversation._id).then((res) => {
          if (res?.messages) setMessages(res.messages);
        }).catch(() => {});
      }
    }, 6000);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('item_taken', handleItemTaken);
      socketService.off('chat_closed_item_taken', handleItemTaken);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (conversation?._id) socketService.leaveConversation(conversation._id);
    };
  }, [request?._id, request?.status, conversation?._id, isTaken, loadConversationAndMessages, addToast, onRequestUpdated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Send Message
  const handleSendMessage = async (textToSend) => {
    const content = (textToSend || text).trim();
    if (!content || !conversation?._id || sending) return;

    setSending(true);
    setText('');

    try {
      const res = await messageService.sendMessage(conversation._id, content);
      if (res?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.message._id)) return prev;
          return [...prev, res.message];
        });
      }
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      addToast({
        title: 'Failed to Send',
        message: err.response?.data?.message || err.message || 'Could not send message. Please try again.',
        variant: 'error'
      });
      setText(content);
    } finally {
      setSending(false);
    }
  };

  // Quick Rapido Chips
  const quickChips = [
    "📍 I'm at the pickup location",
    "⏰ Will reach in 10 minutes",
    "👋 Can you share the exact landmark?",
    "📦 The item is ready for handover",
    "🤝 Ready to meet right now"
  ];

  // Handle Mark Item as Taken
  const handleConfirmMarkTaken = async () => {
    setMarkingTaken(true);
    try {
      const res = await requestService.markItemTaken(request._id);
      if (res && res.success) {
        setIsTaken(true);
        setIsTakenModalOpen(false);
        setMessages([]);
        setConversation(null);

        addToast({
          title: 'Item Handover Complete!',
          message: 'The item was marked as taken. This chat has been permanently closed and wiped from the database for your privacy.',
          variant: 'success'
        });

        if (onRequestUpdated) onRequestUpdated();
      } else {
        throw new Error(res?.message || 'Failed to mark item as taken.');
      }
    } catch (err) {
      addToast({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Unable to mark item as taken.',
        variant: 'error'
      });
    } finally {
      setMarkingTaken(false);
    }
  };

  // ====================================================
  // 1. COMPLETED / ITEM TAKEN STATE (Chat is closed & deleted)
  // ====================================================
  if (isTaken || request?.status === 'COMPLETED') {
    return (
      <div
        style={{
          border: '1.5px solid #a7f3d0',
          backgroundColor: '#f0fdf4',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            marginBottom: '12px'
          }}
        >
          <PackageCheck size={28} />
        </div>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#166534' }}>
          Item Handover Concluded (Item Taken)
        </h4>
        <p style={{ margin: '0 0 14px 0', fontSize: '0.875rem', color: '#15803d', lineHeight: 1.5 }}>
          This item has been successfully received and completed.
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '999px',
            border: '1px solid #bbf7d0',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#065f46'
          }}
        >
          <Lock size={14} />
          <span>Chat box closed & conversation messages permanently deleted from database</span>
        </div>
      </div>
    );
  }

  // ====================================================
  // 2. ACTIVE RAPIDO-STYLE HANDOVER CHATBOX
  // ====================================================
  return (
    <>
      <div
        style={{
          border: '1.5px solid #10b981',
          borderRadius: '18px',
          backgroundColor: '#ffffff',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '620px'
        }}
      >
        {/* Top Header - Rapido Ride / Pickup Styling */}
        <div
          style={{
            backgroundColor: '#064e3b',
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            borderBottom: '2px solid #047857'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar
              src={partner?.avatar}
              name={partner?.name || 'Partner'}
              size="md"
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                  {partner?.name || 'Community Member'}
                </span>
                <span
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {isOwner ? 'Requester' : 'Owner'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#a7f3d0', marginTop: '2px' }}>
                <MapPin size={13} />
                <span>{partnerLocation}</span>
                {partnerPhone && (
                  <>
                    <span style={{ margin: '0 4px', opacity: 0.6 }}>•</span>
                    <Phone size={12} />
                    <span>{partnerPhone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Mark Taken CTA in Header */}
          <button
            type="button"
            onClick={() => setIsTakenModalOpen(true)}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <CheckCircle2 size={14} />
            <span>Mark as Taken</span>
          </button>
        </div>

        {/* Ephemeral Privacy Warning Pill */}
        <div
          style={{
            backgroundColor: '#ecfdf5',
            padding: '6px 14px',
            fontSize: '0.725rem',
            color: '#065f46',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: '1px solid #d1fae5'
          }}
        >
          <Lock size={12} color="#059669" />
          <span>
            <strong>Ephemeral Pickup Chat:</strong> Messages are strictly temporary and permanently deleted from the database once the item is taken.
          </span>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: '#f8fafc',
            minHeight: '220px',
            maxHeight: '300px'
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '140px' }}>
              <Spinner size="md" />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px' }}>
                Active Handover Coordination
              </div>
              <div style={{ fontSize: '0.78rem', maxWidth: '320px', margin: '0 auto' }}>
                Coordinate meeting spot, arrival time, and safe pickup. Send a message or pick a quick suggestion below.
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMine = (m.sender?._id || m.sender?.id || m.sender) === currentUserId;
              const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div
                  key={m._id || m.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '9px 13px',
                      borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      backgroundColor: isMine ? '#047857' : '#ffffff',
                      color: isMine ? '#ffffff' : '#0f172a',
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      border: isMine ? 'none' : '1px solid #e2e8f0',
                      wordBreak: 'break-word'
                    }}
                  >
                    {m.text}
                  </div>
                  {timeStr && (
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '3px', padding: '0 4px' }}>
                      {timeStr}
                    </span>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Rapido Suggestion Chips */}
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none'
          }}
        >
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={sending}
              onClick={() => handleSendMessage(chip)}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #e2e8f0',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '0.725rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#ecfdf5';
                e.currentTarget.style.borderColor = '#a7f3d0';
                e.currentTarget.style.color = '#047857';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#334155';
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            padding: '10px 14px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message to coordinate pickup..."
            disabled={sending}
            maxLength={1000}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.85rem',
              color: '#0f172a',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => (e.target.style.borderColor = '#047857')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            style={{
              backgroundColor: text.trim() ? '#047857' : '#94a3b8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              fontSize: '0.8rem',
              transition: 'background-color 0.15s ease'
            }}
          >
            {sending ? <Spinner size="sm" /> : <Send size={15} />}
            <span>Send</span>
          </button>
        </form>

        {/* Bottom Taken Bar */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Handover done? Click below to conclude.
          </div>
          <Button
            variant="primary"
            size="sm"
            iconLeft={CheckCircle2}
            onClick={() => setIsTakenModalOpen(true)}
            style={{ fontSize: '0.78rem', padding: '6px 12px', backgroundColor: '#059669' }}
          >
            Mark as Taken
          </Button>
        </div>
      </div>

      {/* Confirmation Modal to Mark as Taken & Delete Chat Messages */}
      <Modal
        isOpen={isTakenModalOpen}
        onClose={() => setIsTakenModalOpen(false)}
        title="Mark Item as Taken?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsTakenModalOpen(false)}
              disabled={markingTaken}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={markingTaken}
              disabled={markingTaken}
              onClick={handleConfirmMarkTaken}
              style={{ backgroundColor: '#059669' }}
            >
              Yes, Item Taken (Delete Chat)
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
            Are you sure the item has been safely received/handed over?
          </p>
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <Trash2 size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.45 }}>
              <strong>Permanent Privacy Deletion:</strong> Marking this item as taken will conclude this exchange, immediately close this chat window, and <strong>permanently delete all messages</strong> between you and {partner?.name || 'the customer'} from the database.
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RapidoHandoverChatBox;
