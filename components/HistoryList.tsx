
import React from 'react';
import { TranslationRecord } from '../types';

interface HistoryListProps {
  history: TranslationRecord[];
  title?: string;
  onClear: () => void;
  onSelect: (record: TranslationRecord) => void;
  onToggleSave?: (id: string) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ 
  history, 
  title = "Archive Log", 
  onClear, 
  onSelect,
  onToggleSave 
}) => {
  if (history.length === 0) {
    return (
      <div className="w-full text-center py-20 portal-card border-dashed border-white/10 opacity-30">
        <p className="text-white font-bold uppercase tracking-widest text-sm">No data in memory buffer</p>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-black text-white tracking-widest uppercase">{title}</h2>
        <button 
          onClick={onClear}
          className="text-xs font-bold text-red-400/60 hover:text-red-400 transition-colors uppercase tracking-widest"
        >
          {title.includes("Saved") ? "Unsave All" : "Wipe Memory"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {history.map((item) => (
          <div 
            key={item.id}
            className="portal-card p-6 flex flex-col group hover:bg-white/[0.05]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20 uppercase">
                  {item.sourceLang} &gt;&gt; {item.targetLang}
                </span>
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {onToggleSave && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleSave(item.id); }}
                  className={`p-2 rounded-lg transition-all anime-pop ${item.isSaved ? 'text-yellow-400 bg-yellow-400/10' : 'text-white/20 hover:text-white'}`}
                >
                  <svg className="w-5 h-5" fill={item.isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              )}
            </div>
            <div onClick={() => onSelect(item)} className="cursor-pointer flex-1">
              <p className="text-white/40 text-sm line-clamp-1 mb-2 font-medium">{item.sourceText}</p>
              <p className="text-white font-bold text-lg group-hover:text-cyan-400 transition-colors">{item.translatedText}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
