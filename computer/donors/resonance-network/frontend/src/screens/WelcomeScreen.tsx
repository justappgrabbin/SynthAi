import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkConnection, getApiBaseUrl, setApiBaseUrl } from '../services/apiService';

const WelcomeScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const [connected, setConnected] = useState<boolean | null>(null); // null = checking
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');

  const runCheck = async () => {
    setConnected(null);
    const ok = await checkConnection();
    setConnected(ok);
    if (!ok) setShowServerConfig(true);
  };

  useEffect(() => {
    setServerUrlInput(getApiBaseUrl());
    runCheck();
  }, []);

  const testAndSave = async () => {
    setTesting(true);
    setTestResult('idle');
    const ok = await checkConnection(serverUrlInput);
    if (ok) {
      setApiBaseUrl(serverUrlInput);
      setTestResult('ok');
      setConnected(true);
      setTimeout(() => setShowServerConfig(false), 800);
    } else {
      setTestResult('fail');
      setConnected(false);
    }
    setTesting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('pending_email', email);
    sessionStorage.setItem('pending_name', name);
    navigate('/birth-data');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-purple safe-area-top safe-area-bottom">
      <div className="container mx-auto px-4 py-8 flex flex-col justify-center min-h-screen max-w-md">
        <div className="text-center mb-8">
          <i className="fa fa-door-open text-6xl text-retro-cyan mb-4 animate-pixel-pulse"></i>
          <h1 className="text-3xl font-pixel text-white text-shadow-pixel mb-2">
            Welcome to
          </h1>
          <h2 className="text-4xl font-pixel text-retro-yellow text-shadow-pixel mb-4">
            RESONANCE NETWORK
          </h2>
          <p className="text-white/80 font-pixel text-sm">
            A living field that only wins when you do
          </p>
        </div>

        {/* Connection status -- this is the actual fix: a silent dead-end
            call now surfaces as something you can see and fix. */}
        <div className="mb-4">
          <button
            onClick={() => setShowServerConfig((s) => !s)}
            className="w-full flex items-center justify-center gap-2 font-pixel text-[10px] py-2 min-h-[44px]"
          >
            {connected === null && <><i className="fa fa-spinner animate-pixel-spin text-white/50"></i><span className="text-white/50">CHECKING CONNECTION...</span></>}
            {connected === true && <><i className="fa fa-circle text-retro-green text-[8px]"></i><span className="text-retro-green">CONNECTED</span></>}
            {connected === false && <><i className="fa fa-circle text-retro-red text-[8px]"></i><span className="text-retro-red">NOT CONNECTED -- TAP TO FIX</span></>}
          </button>

          {showServerConfig && (
            <div className="pixel-card mt-2 animate-slide-up">
              <label className="block text-retro-cyan font-pixel text-xs mb-2">
                <i className="fa fa-server mr-2"></i>SERVER ADDRESS
              </label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                className="w-full pixel-input mb-3"
                placeholder="https://your-backend.example.com/api"
              />
              <button
                onClick={testAndSave}
                disabled={testing}
                className="w-full pixel-button !py-2 !text-xs disabled:opacity-50"
              >
                {testing ? <><i className="fa fa-spinner animate-pixel-spin mr-2"></i>TESTING...</> : 'TEST & SAVE'}
              </button>
              {testResult === 'ok' && (
                <p className="font-pixel text-[10px] text-retro-green mt-2"><i className="fa fa-check mr-1"></i>Connected.</p>
              )}
              {testResult === 'fail' && (
                <p className="font-pixel text-[10px] text-retro-red mt-2">
                  <i className="fa fa-exclamation-triangle mr-1"></i>
                  Couldn't reach that address. Check it's running and reachable from this device.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="pixel-card mb-6 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-retro-cyan font-pixel text-sm mb-2">
                <i className="fa fa-user mr-2"></i>
                NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pixel-input"
                placeholder="What should we call you"
                required
              />
            </div>

            <div>
              <label className="block text-retro-cyan font-pixel text-sm mb-2">
                <i className="fa fa-envelope mr-2"></i>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pixel-input"
                placeholder="your@email.com"
                required
              />
            </div>

            <button type="submit" disabled={connected === false} className="w-full pixel-button disabled:opacity-50">
              <i className="fa fa-arrow-right mr-2"></i>
              ENTER THE FIELD
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-white/60 font-pixel text-xs">
            Your birth data stays yours. Nothing is shared without your say.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
