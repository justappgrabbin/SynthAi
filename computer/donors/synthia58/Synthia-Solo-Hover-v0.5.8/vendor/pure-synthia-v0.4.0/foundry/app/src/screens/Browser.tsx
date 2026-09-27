import { useState, useEffect } from 'react';
import type { Fragment } from '../types';
import { getAllFragments } from '../lib/storage';
import { GlyphIcon } from '../components/GlyphIcon';

type QualityFilter = 'all' | 'draft' | 'tested' | 'production' | 'archived';

export function Browser() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null);

  const loadFragments = async () => {
    const allFragments = await getAllFragments();
    setFragments(allFragments);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFragments();
  }, []);

  const filteredFragments = fragments.filter(fragment => {
    // Quality filter
    if (qualityFilter !== 'all' && fragment.metadata.quality !== qualityFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        fragment.filename.toLowerCase().includes(searchLower) ||
        fragment.type.toLowerCase().includes(searchLower) ||
        fragment.metadata.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        fragment.glyph.includes(searchTerm)
      );
    }

    return true;
  });

  const stats = {
    total: fragments.length,
    draft: fragments.filter(f => f.metadata.quality === 'draft').length,
    tested: fragments.filter(f => f.metadata.quality === 'tested').length,
    production: fragments.filter(f => f.metadata.quality === 'production').length,
    archived: fragments.filter(f => f.metadata.quality === 'archived').length,
    locked: fragments.filter(f => f.metadata.qualityLocked).length,
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Component Browser</h1>
        <p className="text-gray-600">
          Explore your glyphed component library with quality-based filtering
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-gray-100 border-2 border-gray-400 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-700">{stats.draft}</div>
          <div className="text-xs text-gray-500">Draft</div>
        </div>
        <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{stats.tested}</div>
          <div className="text-xs text-blue-500">Tested</div>
        </div>
        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{stats.production}</div>
          <div className="text-xs text-green-500">Production</div>
        </div>
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{stats.archived}</div>
          <div className="text-xs text-red-500">Archived</div>
        </div>
        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{stats.locked}</div>
          <div className="text-xs text-yellow-500">🔒 Locked</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by filename, type, tags, or glyph..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Quality Levels</option>
              <option value="draft">Draft Only</option>
              <option value="tested">Tested Only</option>
              <option value="production">Production Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredFragments.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No components match your filters
          </div>
        ) : (
          filteredFragments.map(fragment => (
            <div
              key={fragment.id}
              onClick={() => setSelectedFragment(fragment)}
              className="bg-white border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <GlyphIcon glyph={fragment.glyph} size="sm" className="text-gray-600" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate text-sm">
                    {fragment.filename}
                  </h3>
                  <div className="text-xs text-gray-500 mt-1">
                    {fragment.type}
                  </div>
                </div>
              </div>

              {fragment.metadata.quality && (
                <div className="mb-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    fragment.metadata.quality === 'production' ? 'bg-green-200 text-green-800' :
                    fragment.metadata.quality === 'tested' ? 'bg-blue-200 text-blue-800' :
                    fragment.metadata.quality === 'archived' ? 'bg-red-200 text-red-800' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {fragment.metadata.quality}
                    {fragment.metadata.qualityLocked && ' 🔒'}
                  </span>
                </div>
              )}

              {fragment.metadata.origin && (
                <div className="text-xs text-gray-400 truncate">
                  {fragment.metadata.origin}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedFragment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GlyphIcon glyph={selectedFragment.glyph} size="md" />
                <div>
                  <h2 className="text-2xl font-bold">{selectedFragment.filename}</h2>
                  <p className="text-sm text-gray-500">{selectedFragment.type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFragment(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">Metadata</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Glyph:</strong> {selectedFragment.glyph}</p>
                    <p><strong>Quality:</strong> {selectedFragment.metadata.quality || 'none'} {selectedFragment.metadata.qualityLocked && '🔒'}</p>
                    <p><strong>Status:</strong> {selectedFragment.status}</p>
                    <p><strong>Size:</strong> {(selectedFragment.metadata.size / 1024).toFixed(2)} KB</p>
                    {selectedFragment.metadata.origin && (
                      <p><strong>Origin:</strong> {selectedFragment.metadata.origin}</p>
                    )}
                  </div>
                </div>
                <div>
                  {selectedFragment.metadata.tags && selectedFragment.metadata.tags.length > 0 && (
                    <>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedFragment.metadata.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <h3 className="font-semibold mb-2">Content Preview</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {selectedFragment.content.slice(0, 2000)}
                {selectedFragment.content.length > 2000 && '\n\n... (truncated)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
