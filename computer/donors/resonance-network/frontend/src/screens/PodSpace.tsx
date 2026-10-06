import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Pod, PodMember, PodMessage } from '../services/apiService';

const PodSpace: React.FC = () => {
  const { podId } = useParams<{ podId: string }>();
  const [pod, setPod] = useState<Pod | null>(null);
  const [members, setMembers] = useState<PodMember[]>([]);
  const [messages, setMessages] = useState<PodMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const navigate = useNavigate();
  const { userId, displayName } = useAuth();

  useEffect(() => {
    if (podId) loadPodData();
  }, [podId]);

  const loadPodData = async () => {
    if (!podId) return;
    setLoading(true);
    try {
      const [podData, memberData, messageData] = await Promise.all([
        apiService.getPod(podId),
        apiService.getPodMembers(podId),
        apiService.getPodMessages(podId),
      ]);
      setPod(podData);
      setMembers(memberData);
      setMessages(messageData);
      setJoined(memberData.some((m) => m.user_id === userId));
    } catch (error) {
      console.error('Error loading pod data:', error);
      setPod(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!podId || !userId) return;
    await apiService.joinPod(podId, userId);
    setJoined(true);
    const memberData = await apiService.getPodMembers(podId);
    setMembers(memberData);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !podId) return;

    setSendingMessage(true);
    try {
      await apiService.postPodMessage(podId, userId, newMessage.trim());
      const updated = await apiService.getPodMessages(podId);
      setMessages(updated);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const nameFor = (uid: string) => {
    if (uid === userId) return displayName || 'You';
    const m = members.find((mm) => mm.user_id === uid);
    return m?.display_name || 'Member';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-green flex items-center justify-center safe-area-top safe-area-bottom">
        <div className="text-center">
          <i className="fa fa-spinner animate-pixel-spin text-4xl text-retro-cyan mb-4"></i>
          <p className="font-pixel text-white">Loading pod space...</p>
        </div>
      </div>
    );
  }

  if (!pod) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-red flex items-center justify-center safe-area-top safe-area-bottom">
        <div className="text-center">
          <i className="fa fa-exclamation-triangle text-4xl text-retro-red mb-4"></i>
          <p className="font-pixel text-white">Pod not found</p>
          <button onClick={() => navigate('/home')} className="pixel-button mt-4">
            RETURN HOME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-green safe-area-top safe-area-bottom">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/home')} className="mr-4 p-2 text-white/60 hover:text-white transition-colors">
            <i className="fa fa-arrow-left text-xl"></i>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-pixel text-white text-shadow-pixel">{pod.name}</h1>
            <span className="font-pixel text-retro-green text-sm">{pod.status.toUpperCase()}</span>
          </div>
        </div>

        <div className="pixel-card mb-6 animate-slide-up">
          <div className="flex items-center mb-3">
            <i className="fa fa-circle-info text-retro-cyan text-xl mr-3"></i>
            <h2 className="font-pixel text-white text-lg">POD INFO</h2>
          </div>
          <p className="text-white/80 font-pixel text-sm mb-3">{pod.description}</p>
          <div className="bg-retro-cyan/10 border border-retro-cyan p-3 mb-3">
            <h4 className="font-pixel text-retro-cyan text-sm mb-1">RESONANCE THEME</h4>
            <p className="font-pixel text-white text-sm">{pod.resonance_theme}</p>
          </div>
          <div className="flex items-center justify-between text-white/60 font-pixel text-sm">
            <span><i className="fa fa-users mr-2"></i>{members.length} members</span>
            {!joined && (
              <button onClick={handleJoin} className="px-3 py-1 bg-retro-green text-pixel-dark font-pixel text-xs">
                JOIN POD
              </button>
            )}
          </div>
        </div>

        <div className="pixel-card mb-6 animate-slide-up">
          <div className="flex items-center mb-3">
            <i className="fa fa-user-group text-retro-green text-xl mr-3"></i>
            <h2 className="font-pixel text-white text-lg">MEMBERS</h2>
          </div>
          <div className="space-y-2">
            {members.length === 0 && (
              <p className="font-pixel text-white/50 text-sm">No members yet -- be the first to join.</p>
            )}
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center p-2 bg-gray-900/50 border border-gray-700">
                <div className="w-8 h-8 bg-retro-green border-2 border-white flex items-center justify-center mr-3">
                  <span className="font-pixel text-white text-xs">
                    {(member.display_name || '?').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-pixel text-white text-sm">
                    {member.user_id === userId ? 'You' : member.display_name}
                  </p>
                  <p className="font-pixel text-white/60 text-xs">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pixel-card animate-slide-up">
          <div className="flex items-center mb-3">
            <i className="fa fa-comments text-retro-pink text-xl mr-3"></i>
            <h2 className="font-pixel text-white text-lg">GROUP CHAT</h2>
          </div>

          <div className="bg-gray-900/50 border border-gray-700 p-3 h-64 overflow-y-auto mb-3">
            <div className="space-y-3">
              {messages.length === 0 && (
                <p className="font-pixel text-white/40 text-xs text-center">No messages yet.</p>
              )}
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.user_id === userId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-2 border-2 ${
                    message.user_id === userId
                      ? 'bg-retro-cyan/20 border-retro-cyan text-retro-cyan'
                      : 'bg-gray-800 border-gray-600 text-white'
                  }`}>
                    <p className="font-pixel text-[10px] opacity-60 mb-1">{nameFor(message.user_id)}</p>
                    <p className="font-pixel text-sm">{message.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 pixel-input text-sm"
              placeholder={joined ? 'Type your message...' : 'Join the pod to chat'}
              disabled={sendingMessage || !joined}
            />
            <button
              type="submit"
              disabled={sendingMessage || !newMessage.trim() || !joined}
              className="px-4 py-3 bg-retro-pink border-2 border-white text-white font-pixel text-sm hover:bg-retro-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingMessage ? <i className="fa fa-spinner animate-pixel-spin"></i> : <i className="fa fa-paper-plane"></i>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PodSpace;
