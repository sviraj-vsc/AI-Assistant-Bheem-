import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Search, Image as ImageIcon, GitMerge } from 'lucide-react';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

export const ArtifactPanel: React.FC<{ artifacts: any[] }> = ({ artifacts }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [artifacts]);

  return (
    <div className="flex flex-col h-full bg-slate-800 text-slate-200 overflow-y-auto p-4 rounded-2xl shadow-xl ml-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
      {artifacts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <p>No artifacts yet.</p>
        </div>
      )}
      {artifacts.map((a, i) => (
        <div key={i} className="mb-6 bg-slate-700/50 p-4 rounded-xl border border-slate-600">
          {a.type === 'search' && (
            <div>
              <h3 className="text-lg font-semibold flex items-center mb-2"><Search className="w-5 h-5 mr-2 text-blue-400"/> Web Search Results</h3>
              <ul className="space-y-3">
                {a.data.map((res: any, idx: number) => (
                  <li key={idx}>
                    <a href={res.url} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline font-medium">{res.title}</a>
                    {res.highlights && <p className="text-sm text-slate-400 mt-1 italic">"{res.highlights[0]}..."</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.type === 'image' && (
            <div>
              <h3 className="text-lg font-semibold flex items-center mb-2"><ImageIcon className="w-5 h-5 mr-2 text-pink-400"/> Generated Image</h3>
              <img src={a.url} alt={a.prompt} className="w-full rounded-lg" />
              <p className="text-xs text-slate-400 mt-2">{a.prompt}</p>
            </div>
          )}
          {a.type === 'mermaid' && (
            <div>
              <h3 className="text-lg font-semibold flex items-center mb-2"><GitMerge className="w-5 h-5 mr-2 text-emerald-400"/> {a.description || 'Diagram'}</h3>
              <MermaidChart chart={a.chart} id={`mermaid-${i}`} />
            </div>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

const MermaidChart = ({ chart, id }: { chart: string, id: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      mermaid.render(id, chart).then((res) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = res.svg;
        }
      }).catch(e => {
        if (containerRef.current) {
          containerRef.current.innerHTML = `<p class="text-red-400">Failed to render chart</p>`;
        }
      });
    }
  }, [chart, id]);

  return <div ref={containerRef} className="overflow-x-auto bg-slate-800 p-2 rounded" />;
}
