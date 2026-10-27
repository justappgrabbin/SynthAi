// ============================================================
// Chat — Instant messaging with contacts, AI bot, emoji picker
// ============================================================

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Search, Send, Smile, Circle, Plus, Bot
} from 'lucide-react';

// ---- Types ----
interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text';
  source?: string;
  residentReceipt?: string;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
  isBot: boolean;
  messages: Message[];
  lastRead?: number;
}

// ---- Emoji Picker ----
const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','👎','❤️','🎉','🔥','👏','😊','🙌','💯','✨','🎵','🌟','💪','🙏','😅','🤗','😴','😋','🤩','😇','🥳','😷','🤯','🥺','😜'];

const EmojiPicker = memo(function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <div className="absolute bottom-14 right-4 z-50 p-3 rounded-xl" style={{ background: 'var(--bg-titlebar)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)', width: 240 }}>
      <div className="grid grid-cols-6 gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="flex items-center justify-center p-1.5 rounded hover:bg-[var(--bg-hover)] transition-all"
            style={{ fontSize: '20px' }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});

// The original Kimi layout is retained. The Computer owns the conversation.
const createInitialConversations = (): Conversation[] => [
  { id: 'bot', name: 'Synthia', avatar: 'bot', status: 'offline', isBot: true, messages: [] },
];

// ---- Typing Indicator ----
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex items-center gap-1 px-4 py-2.5 rounded-2xl" style={{ background: 'var(--bg-titlebar)', borderRadius: '16px 16px 16px 4px' }}>
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-secondary)', animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-secondary)', animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-secondary)', animationDelay: '300ms' }} />
      </div>
    </div>
  );
});

// ---- Helpers ----
const formatTime = (ts: number): string => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDateSeparator = (ts: number): string => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

// ---- Main Chat Component ----
export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>(createInitialConversations);
  const [activeConvId, setActiveConvId] = useState('bot');
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [residentStatus, setResidentStatus] = useState<'checking' | 'connected' | 'unavailable'>('checking');
  const [residentDetails, setResidentDetails] = useState<{ graphs: string[]; trainingExamples: number; languageModel?: { configured: boolean; model: string | null; locality: string; configError?: string | null }; simulationKernels?: { id: string; version: string }[] } | null>(null);

  // Never mark Synthia online unless the resident itself answers the health check.
  const verifyResident = useCallback(async () => {
    setResidentStatus('checking');
    try {
      const response = await fetch('/api/synthia/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Synthia resident not reachable');
      const data = await response.json();
      if (data?.id !== 'synthia-resident' || data?.role !== 'computer-resident' ||
          !Array.isArray(data?.graphs) || !data.graphs.includes('klein-semantic-spacetime')) {
        throw new Error('Unexpected resident identity');
      }
      setResidentDetails({ graphs: data.graphs, trainingExamples: Number(data.trainingExamples) || 0,
        languageModel: data.languageModel, simulationKernels: data.simulationKernels });
      setResidentStatus('connected');
      setConversations((prev) => prev.map((c) => c.id === 'bot' ? { ...c, status: 'online' } : c));
    } catch {
      setResidentDetails(null);
      setResidentStatus('unavailable');
      setConversations((prev) => prev.map((c) => c.id === 'bot' ? { ...c, status: 'offline' } : c));
    }
  }, []);

  useEffect(() => { void verifyResident(); }, [verifyResident]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  useEffect(() => {
    fetch('/api/history').then(async (response) => {
      if (!response.ok) throw new Error(`History unavailable (${response.status})`);
      return response.json();
    }).then((items: { id: string; at: string; input: string; text: string }[]) => {
      const messages: Message[] = items.flatMap((item) => [
        { id: `${item.id}-user`, senderId: 'user', content: item.input, timestamp: Date.parse(item.at), type: 'text' as const },
        { id: `${item.id}-bot`, senderId: 'bot', content: item.text, timestamp: Date.parse(item.at), type: 'text' as const },
      ]);
      setConversations((prev) => [{ ...prev[0], messages }]);
    }).catch((error) => {
      setConversations((prev) => [{ ...prev[0], messages: [
        { id: 'connection-error', senderId: 'bot', content: String(error), timestamp: Date.now(), type: 'text' },
      ] }]);
    });
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv.messages, isTyping]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isTyping || residentStatus !== 'connected') return;
    const newMessage: Message = { id: crypto.randomUUID(), senderId: 'user', content: text, timestamp: Date.now(), type: 'text' };
    setConversations((prev) => prev.map((c) => c.id === activeConvId ? { ...c, messages: [...c.messages, newMessage] } : c));
    setInputText('');
    setIsTyping(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Chat failed (${res.status})`);
      if (!data?.resident?.readingId || !data?.resident?.id) {
        throw new Error('Computer replied without a verified Synthia resident receipt.');
      }
      let source = data.provider === 'local-morph'
        ? (data.intent === 'greeting' ? 'Prewritten greeting from local Morph provider' : 'Rule-based reply from local Morph provider')
        : `Reply provider: ${String(data.provider ?? 'unidentified')}`;
      if (data.model?.fallbackReason) source += ` · Model unavailable; local donor fallback (${String(data.model.fallbackReason)})`;
      if (data.simulation?.evidence?.measured === false) source += ' · Synthetic model output, not measured';
      const reply: Message = { id: data.id, senderId: 'bot', content: data.text,
        timestamp: Date.parse(data.at), type: 'text', source, residentReceipt: data.resident.readingId };
      setConversations((prev) => prev.map((c) => c.id === activeConvId ? { ...c, messages: [...c.messages, reply] } : c));
    } catch (error) {
      const failure: Message = { id: crypto.randomUUID(), senderId: 'bot', content: `The local conversation path failed: ${String(error)}`, timestamp: Date.now(), type: 'text' };
      setConversations((prev) => prev.map((c) => c.id === activeConvId ? { ...c, messages: [...c.messages, failure] } : c));
    } finally { setIsTyping(false); }
  }, [inputText, activeConvId, isTyping, residentStatus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const addEmoji = (emoji: string) => setInputText((prev) => prev + emoji);

  const createNewChat = (_name: string) => {
    setActiveConvId('bot');
    setShowNewChat(false);
  };

  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  activeConv.messages.forEach((msg) => {
    const dateLabel = formatDateSeparator(msg.timestamp);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateLabel) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateLabel, messages: [msg] });
    }
  });

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-window)' }}>
      {/* Left Sidebar */}
      <div className="computer-chat-sidebar flex flex-col shrink-0" style={{ width: 220, borderRight: '1px solid var(--border-subtle)' }}>
        <div className="p-3 shrink-0">
          <div className="flex items-center gap-2 px-3" style={{ height: 36, borderRadius: 18, background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
            <Search size={14} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations"
              className="flex-1 bg-transparent outline-none"
              style={{ color: 'var(--text-primary)', fontSize: '13px' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConvs.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className="flex items-start gap-3 w-full px-3 py-2 text-left transition-all"
                style={{
                  background: conv.id === activeConvId ? 'var(--bg-selected)' : 'transparent',
                }}
              >
                <div className="relative shrink-0">
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 44, height: 44,
                      background: conv.isBot ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                      color: 'white', fontSize: '14px', fontWeight: 600,
                    }}
                  >
                    {conv.isBot ? <Bot size={20} /> : conv.avatar}
                  </div>
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{
                      background: conv.status === 'online' ? 'var(--accent-success)' : conv.status === 'away' ? 'var(--accent-warning)' : 'var(--text-disabled)',
                      borderColor: 'var(--bg-window)',
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{conv.name}</span>
                    {lastMsg && (
                      <span style={{ fontSize: '10px', color: 'var(--text-disabled)', flexShrink: 0 }}>{formatTime(lastMsg.timestamp)}</span>
                    )}
                  </div>
                  {lastMsg && (
                    <span className="truncate block" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {lastMsg.senderId === 'user' ? 'You: ' : ''}{lastMsg.content}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-full flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ height: 36, borderRadius: 'var(--radius-md)', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', fontWeight: 500 }}
          >
            <Plus size={16} /> New Chat
          </button>
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-titlebar)' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 36, height: 36,
                background: activeConv.isBot ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                color: 'white', fontSize: '12px', fontWeight: 600,
              }}
            >
              {activeConv.isBot ? <Bot size={18} /> : activeConv.avatar}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeConv.name}</div>
              <div className="flex items-center gap-1">
                <Circle size={8} fill={activeConv.status === 'online' ? 'var(--accent-success)' : activeConv.status === 'away' ? 'var(--accent-warning)' : 'var(--text-disabled)'} style={{ color: 'transparent' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {residentStatus === 'connected' ? 'Resident connected' : residentStatus === 'checking' ? 'Checking resident…' : 'Resident unavailable'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status is verified against Synthia Resident; replies are authored by Morph/Klein. */}
        <div role="status" className="flex items-center justify-between gap-2 px-4 py-2 text-xs" style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <span>
            {residentStatus === 'connected' && residentDetails
              ? `Resident verified · ${residentDetails.graphs.length} graphs · ${residentDetails.trainingExamples} supervised examples · ${residentDetails.languageModel?.configured ? `LLM configured: ${residentDetails.languageModel.model} (${residentDetails.languageModel.locality})` : 'No LLM configured; Morph rules'} · ${(residentDetails.simulationKernels ?? []).length} numerical kernel(s)`
              : residentStatus === 'checking' ? 'Verifying Synthia in this Computer…'
              : 'Synthia is unavailable. No simulated reply will be shown.'}
          </span>
          <button type="button" onClick={() => void verifyResident()} style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>Check</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 flex flex-col gap-1">
          {groupedMessages.map((group) => (
            <div key={group.date} className="flex flex-col gap-1">
              <div className="flex justify-center my-2">
                <span className="px-3 py-1 rounded-full" style={{ fontSize: '11px', color: 'var(--text-disabled)', background: 'var(--bg-titlebar)' }}>
                  {group.date}
                </span>
              </div>
              {group.messages.map((msg) => {
                const isSent = msg.senderId === 'user';
                return (
                  <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className="flex flex-col max-w-[70%]">
                      <div
                        className="px-3.5 py-2.5"
                        style={{
                          borderRadius: isSent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isSent ? 'var(--accent-primary)' : 'var(--bg-titlebar)',
                          color: isSent ? 'white' : 'var(--text-primary)',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.content}
                      </div>
                      {!isSent && msg.source && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: 4 }}>
                          {msg.source}{msg.residentReceipt ? ` · Resident observed: ${msg.residentReceipt}` : ''}
                        </span>
                      )}
                      <span className={`mt-0.5 ${isSent ? 'text-right' : 'text-left'}`} style={{ fontSize: '10px', color: 'var(--text-disabled)', opacity: 0.7 }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0 relative" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-titlebar)' }}>
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="flex items-center justify-center rounded-full transition-all hover:bg-[var(--bg-hover)]"
            style={{ width: 32, height: 32, flexShrink: 0 }}
          >
            <Smile size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          {showEmoji && <EmojiPicker onSelect={addEmoji} onClose={() => setShowEmoji(false)} />}
          {activeConv.messages.length === 0 && <button type="button" onClick={() => setInputText('Hello Synthia. I would like to talk with you.')} disabled={residentStatus !== 'connected'} style={{ fontSize: 12, color: 'var(--accent-primary)', opacity: residentStatus === 'connected' ? 1 : 0.5 }}>Say hello</button>}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 outline-none"
            style={{
              height: 40, borderRadius: 20, background: 'var(--bg-input)',
              border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isTyping || residentStatus !== 'connected'}
            className="flex items-center justify-center rounded-full transition-all hover:opacity-90"
            style={{
              width: 36, height: 36,
              background: inputText.trim() ? 'var(--accent-primary)' : 'var(--border-default)',
              color: inputText.trim() ? 'white' : 'var(--text-disabled)',
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* New Chat Dialog */}
      {showNewChat && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="p-5 rounded-xl" style={{ width: 320, background: 'var(--bg-window)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>New Conversation</h3>
            <NewChatForm onCreate={createNewChat} onCancel={() => setShowNewChat(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- New Chat Form ----
function NewChatForm({ onCreate, onCancel }: { onCreate: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Contact name"
        autoFocus
        className="w-full px-3 outline-none"
        style={{ height: 36, borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px' }}
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]" style={{ fontSize: '13px', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>Cancel</button>
        <button
          onClick={() => { if (name.trim()) onCreate(name.trim()); }}
          disabled={!name.trim()}
          className="px-4 py-2 rounded-lg transition-all hover:opacity-90"
          style={{ fontSize: '13px', fontWeight: 500, background: 'var(--accent-primary)', color: 'white', opacity: name.trim() ? 1 : 0.5 }}
        >
          Start Chat
        </button>
      </div>
    </div>
  );
}
