import { useState, useEffect } from 'react';
import type { Fragment } from '../types';
import { FragmentCard } from '../components/FragmentCard';
import { getFragmentsByStatus, saveFragment, saveApp, saveJob } from '../lib/storage';
import { createAssemblyJob, assembleApp } from '../lib/assembler';
import { useNavigate } from 'react-router-dom';

export function Forge() {
  const [stagedFragments, setStagedFragments] = useState<Fragment[]>([]);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyLog, setAssemblyLog] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadStagedFragments();
  }, []);

  const loadStagedFragments = async () => {
    const staged = await getFragmentsByStatus('staged');
    setStagedFragments(staged);
  };

  const handleAssemble = async () => {
    if (stagedFragments.length === 0) return;

    setIsAssembling(true);
    setAssemblyLog([]);

    try {
      // Create job
      const job = await createAssemblyJob(stagedFragments);
      await saveJob(job);

      // Assemble
      const app = await assembleApp(stagedFragments, job, (log) => {
        setAssemblyLog(prev => [...prev, log]);
      });

      // Save app
      await saveApp(app);

      // Update job
      await saveJob(job);

      // Mark fragments as consumed
      for (const fragment of stagedFragments) {
        fragment.status = 'consumed';
        fragment.consumedBy = app.id;
        await saveFragment(fragment);
      }

      setAssemblyLog(prev => [...prev, '✓ Assembly complete! Redirecting to Vault...']);
      
      setTimeout(() => {
        navigate('/vault');
      }, 2000);

    } catch (error) {
      setAssemblyLog(prev => [...prev, `✗ Error: ${error}`]);
    } finally {
      setIsAssembling(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">The Forge</h1>
        <p className="text-gray-600">
          Staged fragments ready to be assembled into a complete app.
        </p>
      </div>

      {stagedFragments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No fragments staged yet. Go to the Pool and select some fragments to assemble.
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h2 className="font-semibold text-blue-900 mb-2">
                {stagedFragments.length} fragment{stagedFragments.length !== 1 ? 's' : ''} staged
              </h2>
              <p className="text-sm text-blue-700">
                Ready to assemble into a complete application
              </p>
            </div>

            <button
              onClick={handleAssemble}
              disabled={isAssembling}
              className={`
                w-full px-6 py-3 rounded-lg font-medium text-white transition-colors
                ${isAssembling 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
                }
              `}
            >
              {isAssembling ? 'Assembling...' : 'Assemble App'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {stagedFragments.map(fragment => (
              <FragmentCard key={fragment.id} fragment={fragment} />
            ))}
          </div>

          {assemblyLog.length > 0 && (
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
              <div className="mb-2 text-gray-400">Assembly Log:</div>
              {assemblyLog.map((log, i) => (
                <div key={i} className="mb-1">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
