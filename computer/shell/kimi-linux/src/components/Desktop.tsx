// ============================================================
// Desktop — Wallpaper + draggable desktop icons + context menu
// ============================================================

import { useCallback, memo, useState, useRef } from 'react';
import { useOS } from '@/hooks/useOSStore';
import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const DynamicIcon = ({ name, ...props }: { name: string } & LucideProps) => {
  const IconComp = (Icons as unknown as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  return IconComp ? <IconComp {...props} /> : <Icons.HelpCircle {...props} />;
};

const GRID_X = 80;
const GRID_Y = 90;

const Desktop = memo(function Desktop() {
  const { state, dispatch } = useOS();
  const { desktopIcons, theme } = state;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const desktopRef = useRef<HTMLDivElement>(null);

  const handleIconDoubleClick = useCallback(
    (icon: typeof desktopIcons[0]) => {
      if (icon.appId) {
        dispatch({ type: 'OPEN_WINDOW', appId: icon.appId });
      }
    },
    [dispatch]
  );

  const handleIconMouseDown = useCallback(
    (e: React.MouseEvent, icon: typeof desktopIcons[0]) => {
      e.stopPropagation();
      dispatch({ type: 'SELECT_DESKTOP_ICON', id: icon.id });
      if (icon.appId) {
        setDraggingId(icon.id);
        setDragOffset({ x: e.clientX, y: e.clientY });
      }
    },
    [dispatch]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId) return;
      const dx = e.clientX - dragOffset.x;
      const dy = e.clientY - dragOffset.y;
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

      const icon = desktopIcons.find((i) => i.id === draggingId);
      if (!icon) return;

      const nx = Math.round((icon.position.x + dx) / GRID_X) * GRID_X + 16;
      const ny = Math.round((icon.position.y + dy) / GRID_Y) * GRID_Y + 16;

      dispatch({
        type: 'UPDATE_DESKTOP_ICON_POSITION',
        id: draggingId,
        position: { x: Math.max(16, nx), y: Math.max(16, ny) },
      });
      setDragOffset({ x: e.clientX, y: e.clientY });
    },
    [draggingId, dragOffset, desktopIcons, dispatch]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch({
        type: 'SHOW_CONTEXT_MENU',
        x: e.clientX,
        y: e.clientY,
        menuType: 'desktop',
        items: [
          { id: 'open-files', label: 'Open Files', icon: 'Folder', action: 'OPEN_APP:filemanager' },
          { id: 'import', label: 'Import Files', icon: 'FileUp', action: 'OPEN_APP:ingest' },
          { id: 'minimize', label: 'Minimize Windows', icon: 'PanelsTopLeft', action: 'MINIMIZE_ALL' },
        ],
      });
    },
    [dispatch]
  );

  return (
    <div
      ref={desktopRef}
      className="fixed inset-0 z-10"
      style={{
        backgroundImage: `url(${theme.wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        top: 28,
        bottom: 48,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleDesktopContextMenu}
      onClick={() => dispatch({ type: 'SELECT_DESKTOP_ICON', id: null })}
    >
      {/* Desktop Icons */}
      {desktopIcons.map((icon) => (
        <div
          key={icon.id}
          className="absolute flex flex-col items-center gap-1 cursor-pointer group"
          style={{
            left: icon.position.x,
            top: icon.position.y,
            width: 64,
            opacity: draggingId === icon.id ? 0.5 : 1,
            animation: 'iconAppear 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onDoubleClick={() => handleIconDoubleClick(icon)}
          onMouseDown={(e) => handleIconMouseDown(e, icon)}
          onContextMenu={(e) => {
            e.stopPropagation();
            dispatch({
              type: 'SHOW_CONTEXT_MENU',
              x: e.clientX,
              y: e.clientY,
              menuType: 'file',
              items: [
                { id: 'open', label: 'Open', icon: 'ExternalLink', action: `OPEN_APP:${icon.appId}` },
              ],
              contextData: { iconId: icon.id },
            });
          }}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: icon.isSelected ? 'rgba(124,77,255,0.20)' : 'transparent',
              border: icon.isSelected ? '1px dashed rgba(124,77,255,0.50)' : '1px solid transparent',
            }}
          >
            <DynamicIcon
              name={icon.icon}
              size={32}
              className="text-[var(--text-primary)] drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
            />
          </div>
          <span
            className="text-[10px] font-medium text-center px-1 py-0.5 rounded max-w-[72px] truncate leading-tight"
            style={{
              color: '#E0E0E0',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              background: icon.isSelected ? 'rgba(124,77,255,0.30)' : 'transparent',
            }}
          >
            {icon.name}
          </span>
        </div>
      ))}

      <style>{`
        @keyframes iconAppear {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});

export default Desktop;
