import { useState, useEffect } from 'react';
import type { App } from '../types';
import { GlyphIcon } from '../components/GlyphIcon';
import { getAllApps, deleteApp } from '../lib/storage';

export function Vault() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);

  const loadApps = async () => {
    const allApps = await getAllApps();
    setApps(allApps.filter(app => !app.archived).sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    ));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadApps();
  }, []);

  const handleDelete = async (appId: string) => {
    if (confirm('Archive this app? It will remain preserved in storage.')) {
      await deleteApp(appId);
      await loadApps();
      if (selectedApp?.id === appId) {
        setSelectedApp(null);
      }
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const downloadAsZip = (app: App) => {
    const blob = new Blob([JSON.stringify(app.structure.tree, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${app.name}.foundry.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">The Vault</h1>
        <p className="text-gray-600">
          Your completed apps. These are artifacts, not ingredients.
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No apps yet. Assemble some fragments in the Forge to create your first app.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map(app => (
            <div
              key={app.id}
              className="border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setSelectedApp(app)}
            >
              <div className="flex items-start gap-3 mb-3">
                <GlyphIcon glyph={app.glyph} size="sm" className="text-gray-600" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {app.name}
                  </h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatDate(app.created)}
                  </div>
                </div>
              </div>

              {app.metadata.framework && (
                <div className="mb-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {app.metadata.framework}
                  </span>
                </div>
              )}

              <div className="text-sm text-gray-600 mb-3">
                Built from {app.sourceFragments.length} fragment{app.sourceFragments.length !== 1 ? 's' : ''}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadAsZip(app);
                  }}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Export
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(app.id);
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GlyphIcon glyph={selectedApp.glyph} size="sm" />
                <div>
                  <h2 className="text-2xl font-bold">{selectedApp.name}</h2>
                  <p className="text-sm text-gray-500">{formatDate(selectedApp.created)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              <h3 className="font-semibold mb-2">File Structure:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(selectedApp.structure.tree, null, 2)}
              </pre>

              <div className="mt-4">
                <h3 className="font-semibold mb-2">Metadata:</h3>
                <div className="text-sm">
                  <p><strong>Framework:</strong> {selectedApp.metadata.framework || 'Unknown'}</p>
                  <p><strong>Entry:</strong> {selectedApp.structure.entry}</p>
                  <p><strong>Status:</strong> {selectedApp.metadata.validationStatus}</p>
                  <p><strong>Source Fragments:</strong> {selectedApp.sourceFragments.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
