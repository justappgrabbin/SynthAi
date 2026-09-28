import type { Fragment } from '../types';
import { GlyphIcon } from './GlyphIcon';

interface FragmentCardProps {
  fragment: Fragment;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onQualityChange?: (quality: Fragment['metadata']['quality']) => void;
}

export function FragmentCard({ fragment, selected, onSelect, onClick, onQualityChange }: FragmentCardProps) {
  const statusColors = {
    pool: 'bg-white border-gray-300',
    staged: 'bg-blue-50 border-blue-400',
    consumed: 'bg-gray-100 border-gray-400',
    archived: 'bg-gray-50 border-gray-300'
  };

  const qualityColors = {
    draft: 'bg-gray-200 text-gray-700',
    tested: 'bg-blue-200 text-blue-800',
    production: 'bg-green-200 text-green-800',
    archived: 'bg-red-200 text-red-800'
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`
        relative border-2 rounded-lg p-4 cursor-pointer transition-all
        ${statusColors[fragment.status]}
        ${selected ? 'ring-2 ring-blue-500' : ''}
        hover:shadow-md
      `}
      onClick={onClick}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3"
        />
      )}
      
      <div className="flex items-start gap-3">
        <GlyphIcon glyph={fragment.glyph} size="sm" className="text-gray-600" />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {fragment.filename}
          </h3>
          
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
              {fragment.type}
            </span>
            <span>{formatSize(fragment.metadata.size)}</span>
            <span>•</span>
            <span>{formatDate(fragment.added)}</span>
          </div>

          {fragment.metadata.tags && fragment.metadata.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {fragment.metadata.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {onQualityChange && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <label className="text-xs text-gray-500 block mb-1">
                Quality:
                {fragment.metadata.qualityLocked && (
                  <span className="ml-2 text-xs text-red-600">🔒 Locked</span>
                )}
              </label>
              <select
                value={fragment.metadata.quality || 'draft'}
                onChange={(e) => onQualityChange(e.target.value as Fragment['metadata']['quality'])}
                onClick={(e) => e.stopPropagation()}
                disabled={fragment.metadata.qualityLocked}
                className={`text-xs px-2 py-1 rounded ${qualityColors[fragment.metadata.quality || 'draft']} border-0 font-medium ${fragment.metadata.qualityLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="draft">Draft</option>
                <option value="tested">Tested</option>
                <option value="production">Production</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
