import React, { useState, useEffect, useCallback } from 'react';
import { BheemFace } from './components/BheemFace';
import { ArtifactPanel } from './components/ArtifactPanel';
import { useRealtimeAPI } from './hooks/useRealtimeAPI';
import type { ToolCall } from './hooks/useRealtimeAPI';
import { handleToolCall } from './tools';

export default function App() {
  const [keys, setKeys] = useState(() => ({
    gemini: localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || '',
    exa: localStorage.getItem('EXA_API_KEY') || import.meta.env.VITE_EXA_API_KEY || ''
  }));
  const [showConfig, setShowConfig] = useState(!keys.gemini);
  const [artifacts, setArtifacts] = useState<any[]>(() => {
    const saved = localStorage.getItem('bheem_artifacts');
    return saved ? JSON.parse(saved) : [];
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Save artifacts on change
  useEffect(() => {
    localStorage.setItem('bheem_artifacts', JSON.stringify(artifacts));
  }, [artifacts]);

  const addArtifact = useCallback((artifact: any) => {
    setArtifacts(prev => [...prev, artifact]);
  }, []);

  const onToolCall = useCallback(async (tool: ToolCall) => {
    return await handleToolCall(tool, keys, addArtifact);
  }, [keys, addArtifact]);

  const { status, activeTask, volume, connect, disconnect } = useRealtimeAPI(keys.gemini, onToolCall, setArtifacts, setErrorMsg);

  useEffect(() => {
    if (errorMsg && errorMsg.includes('API key not valid')) {
      localStorage.removeItem('GEMINI_API_KEY');
      setShowConfig(true);
      setKeys(k => ({...k, gemini: ''}));
      setErrorMsg(null);
    }
  }, [errorMsg]);

  useEffect(() => {
    // Dynamic resize
    const hasArtifacts = artifacts.length > 0;
    if (window.electronAPI) {
      window.electronAPI.resizeWindow(hasArtifacts ? 800 : 400, 600);
    }
  }, [artifacts.length]);

  if (showConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6" style={{ WebkitAppRegion: 'drag' } as any}>
        <div style={{ WebkitAppRegion: 'no-drag' } as any} className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4">Bheem Setup</h1>
          <input 
            type="password" 
            placeholder="Gemini API Key" 
            value={keys.gemini}
            onChange={e => setKeys(k => ({...k, gemini: e.target.value}))}
            className="w-full p-2 mb-3 bg-slate-800 rounded border border-slate-700"
          />
          <input 
            type="password" 
            placeholder="Exa API Key" 
            value={keys.exa}
            onChange={e => setKeys(k => ({...k, exa: e.target.value}))}
            className="w-full p-2 mb-4 bg-slate-800 rounded border border-slate-700"
          />
          <button 
            onClick={() => {
              localStorage.setItem('GEMINI_API_KEY', keys.gemini);
              localStorage.setItem('EXA_API_KEY', keys.exa);
              setShowConfig(false);
            }}
            className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold transition"
          >
            Save & Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-screen p-4 bg-transparent">
      <div className="w-[368px] flex-shrink-0 flex flex-col gap-4 h-full">
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <BheemFace state={status} volume={volume} />
          {status !== 'idle' && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="text-sm font-medium text-slate-400 capitalize tracking-widest">
                {status}
              </div>
              {activeTask && (
                <div className="text-xs font-medium text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full animate-pulse">
                  {activeTask}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="h-16 flex items-center justify-center gap-4 bg-slate-900 rounded-2xl shadow-xl" style={{ WebkitAppRegion: 'drag' } as any}>
          {status === 'idle' ? (
            <button onClick={() => { setErrorMsg(null); connect(); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium" style={{ WebkitAppRegion: 'no-drag' } as any}>
              Start Talking
            </button>
          ) : (
            <button onClick={disconnect} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-medium" style={{ WebkitAppRegion: 'no-drag' } as any}>
              Stop
            </button>
          )}
          <button onClick={() => setArtifacts([])} className="text-sm text-slate-400 hover:text-white" style={{ WebkitAppRegion: 'no-drag' } as any}>
            Clear Panel
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('GEMINI_API_KEY');
              localStorage.removeItem('EXA_API_KEY');
              window.location.reload();
            }} 
            className="text-sm text-red-400 hover:text-red-300 ml-4" 
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            Reset Keys
          </button>
        </div>
        {errorMsg && (
          <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm mt-2">
            {errorMsg}
          </div>
        )}
      </div>
      
      {artifacts.length > 0 && (
        <div className="flex-1 min-w-0">
          <ArtifactPanel artifacts={artifacts} />
        </div>
      )}
    </div>
  );
}
