import { useState, useEffect } from 'react';
import type { Fragment } from '../types';
import { FileDropZone } from '../components/FileDropZone';
import { FragmentCard } from '../components/FragmentCard';
import { saveFragment, getAllFragments } from '../lib/storage';
import { assignGlyph } from '../lib/glyphs';
import { detectFileType } from '../lib/llm';
import { parseGlyphMetadata, mergeGlyphMetadata } from '../lib/glyphParser';
import { useNavigate } from 'react-router-dom';

export function Pool() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const loadFragments = async () => {
    const allFragments = await getAllFragments();
    setFragments(allFragments.filter(f => f.status === 'pool'));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFragments();
  }, []);

  const handleFilesDropped = async (files: File[]) => {
    for (const file of files) {
      const content = await file.text();
      
      // Check if file already has Foundry metadata
      const parsedMetadata = parseGlyphMetadata(content);
      
      let fragment: Fragment = {
        id: crypto.randomUUID(),
        glyph: assignGlyph(file.name),
        filename: file.name,
        type: detectFileType(file.name),
        content,
        metadata: {
          size: file.size,
          tags: []
        },
        status: 'pool',
        added: new Date().toISOString()
      };

      // If file has existing Foundry metadata, merge it
      if (parsedMetadata) {
        fragment = mergeGlyphMetadata(fragment, parsedMetadata);
      }

      await saveFragment(fragment);
    }

    await loadFragments();
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleStageSelected = async () => {
    const selected = fragments.filter((fragment) => selectedIds.has(fragment.id));
    for (const fragment of selected) {
      await saveFragment({ ...fragment, status: 'staged' });
    }
    setSelectedIds(new Set());
    await loadFragments();
    navigate('/forge');
  };

  const handleQualityChange = async (fragmentId: string, quality: Fragment['metadata']['quality']) => {
    const fragment = fragments.find(f => f.id === fragmentId);
    if (!fragment) return;

    // Check if locked (production components are immutable)
    if (fragment.metadata.qualityLocked) {
      alert('This component is locked at production quality. To modify, create a new version with a different glyph.');
      return;
    }

    // Update quality
    fragment.metadata.quality = quality;

    // Lock if setting to production
    if (quality === 'production') {
      fragment.metadata.qualityLocked = true;
    }

    await saveFragment(fragment);
    await loadFragments();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">The Pool</h1>
        <p className="text-gray-600">
          Drop your fragments here. They're temporary ingredients waiting to become something.
        </p>
      </div>

      <div className="mb-6">
        <FileDropZone onFilesDropped={handleFilesDropped} />
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="text-blue-900 font-medium">
            {selectedIds.size} fragment{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleStageSelected}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Stage for Assembly
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fragments.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No fragments yet. Drop some files to get started.
          </div>
        ) : (
          fragments.map(fragment => (
            <FragmentCard
              key={fragment.id}
              fragment={fragment}
              selected={selectedIds.has(fragment.id)}
              onSelect={() => toggleSelection(fragment.id)}
              onQualityChange={(quality) => handleQualityChange(fragment.id, quality)}
            />
          ))
        )}
      </div>
    </div>
  );
}
