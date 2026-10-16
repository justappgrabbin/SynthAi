import { useState, useEffect, memo } from 'react';
import { format } from 'date-fns';
import { useOS } from '@/hooks/useOSStore';

const TopPanel = memo(function TopPanel() {
  const { dispatch } = useOS();
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-2 text-xs font-medium select-none"
    style={{ height: 28, background: 'var(--bg-panel)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
    <button onClick={() => dispatch({ type: 'TOGGLE_APP_LAUNCHER' })} className="h-7 px-3 rounded hover:bg-[var(--bg-hover)]">Activities</button>
    <button onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_CENTER' })} className="absolute left-1/2 -translate-x-1/2 h-7 px-2 rounded hover:bg-[var(--bg-hover)]">{format(time, 'EEE h:mm a')}</button>
    <span className="px-2 text-[var(--text-secondary)]">Local computer</span>
  </div>;
});
export default TopPanel;
