
import React, { useState, useEffect, useCallback } from 'react';
import { TranslatorMode, TranslationRecord, SUPPORTED_LANGUAGES } from './types';
import LanguageSelector from './components/LanguageSelector';
import VoiceView from './components/VoiceView';
import HistoryList from './components/HistoryList';
import { translateText } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<TranslatorMode>(TranslatorMode.TEXT);
  const [sourceLang, setSourceLang] = useState<string>('en');
  const [targetLang, setTargetLang] = useState<string>('hi');
  const [sourceText, setSourceText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('voice_anuvaad_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('voice_anuvaad_history', JSON.stringify(history));
  }, [history]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;
    
    setIsTranslating(true);
    try {
      const result = await translateText(sourceText, sourceLang, targetLang);
      setTranslatedText(result);

      const newId = Date.now().toString();
      setCurrentId(newId);

      const newRecord: TranslationRecord = {
        id: newId,
        sourceText,
        translatedText: result,
        sourceLang,
        targetLang,
        timestamp: Date.now(),
        isSaved: false
      };
      setHistory(prev => [newRecord, ...prev].slice(0, 50));
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang]);

  const toggleSave = (id: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, isSaved: !item.isSaved } : item
    ));
  };

  const isCurrentSaved = history.find(h => h.id === currentId)?.isSaved;

  const swapLanguages = () => {
    const oldSourceLang = sourceLang;
    const oldTargetLang = targetLang;
    const oldSourceText = sourceText;
    const oldTargetText = translatedText;

    setSourceLang(oldTargetLang);
    setTargetLang(oldSourceLang);
    setSourceText(oldTargetText || "");
    setTranslatedText(oldSourceText || "");

    if (oldTargetText) {
      setTimeout(() => {
        setIsTranslating(true);
        translateText(oldTargetText, oldTargetLang, oldSourceLang).then(res => {
          setTranslatedText(res);
          setIsTranslating(false);
        });
      }, 50);
    }
  };

  const handleSelectHistory = (record: TranslationRecord) => {
    setSourceLang(record.sourceLang);
    setTargetLang(record.targetLang);
    setSourceText(record.sourceText);
    setTranslatedText(record.translatedText);
    setCurrentId(record.id);
    setMode(TranslatorMode.TEXT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pb-20 relative z-10 selection:bg-cyan-500/30">
      <header className="glass-nav sticky top-0 z-50 px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between border-b border-white/10 gap-4">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative w-14 h-14 flex items-center justify-center">
            {/* Animated Logo Background Rings */}
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping duration-[3000ms]"></div>
            <div className="absolute inset-2 border-2 border-dashed border-violet-500/40 rounded-full animate-spin duration-[10000ms]"></div>
            
            {/* The Main "Nexus" Logo */}
            <div className="relative w-11 h-11 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_25px_rgba(6,182,212,0.6)] group-hover:scale-110 transition-transform duration-500">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter">
              VOICE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">ANUVAAD</span>
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
              <span className="text-[8px] md:text-[9px] font-bold text-cyan-400/80 uppercase tracking-[0.2em]">Universal AI Nexus</span>
            </div>
          </div>
        </div>
        
        <nav className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: TranslatorMode.TEXT, label: '⌨️ TEXT' },
            { id: TranslatorMode.VOICE, label: '🎙️ VOICE' },
            { id: TranslatorMode.SAVED, label: '⭐ SAVED' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setMode(tab.id as TranslatorMode)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${mode === tab.id ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto pt-8 md:pt-12 px-4 md:px-8">
        {mode !== TranslatorMode.SAVED && (
          <>
            <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-3 md:gap-8 mb-8 md:mb-12">
              <div className="portal-card p-2 md:p-4">
                <LanguageSelector label="🏁 FROM" value={sourceLang} onChange={setSourceLang} />
              </div>
              
              <button 
                onClick={swapLanguages}
                className="mb-1 md:mb-2 p-3 md:p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all transform hover:rotate-180 duration-700 flex flex-col items-center justify-center"
                title="Swap Languages"
              >
                <span className="text-xl mb-1">🔁</span>
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>

              <div className="portal-card p-2 md:p-4">
                <LanguageSelector label="🚩 TO" value={targetLang} onChange={setTargetLang} />
              </div>
            </div>

            {mode === TranslatorMode.TEXT ? (
              <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  <div className="portal-card group overflow-hidden">
                    <div className="p-6 md:p-8">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">⌨️</span>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">ENTER TEXT</span>
                      </div>
                      <textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Type here..."
                        className="w-full h-48 md:h-64 bg-transparent outline-none text-xl md:text-2xl text-white placeholder-white/20 resize-none font-medium leading-tight custom-scrollbar"
                      />
                      <div className="flex justify-end mt-4">
                        {sourceText && (
                          <button onClick={() => setSourceText('')} className="flex items-center gap-2 text-white/30 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest">
                            <span>🗑️ CLEAR</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="portal-card relative group overflow-hidden border-cyan-500/20 bg-cyan-500/[0.02]">
                    <div className="p-6 md:p-8 h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">✨</span>
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em]">RESULT</span>
                      </div>
                      {isTranslating ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6">
                          <div className="relative">
                            <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                          </div>
                          <span className="text-[10px] font-black text-cyan-400 animate-pulse uppercase tracking-[0.5em]">THINKING...</span>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                          <p className={`text-xl md:text-2xl leading-tight ${translatedText ? 'text-white font-bold' : 'text-white/20 italic'}`}>
                            {translatedText || ""}
                          </p>
                        </div>
                      )}
                      {translatedText && !isTranslating && (
                        <div className="flex justify-end mt-4 gap-2 md:gap-3">
                          <button 
                            onClick={() => currentId && toggleSave(currentId)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${isCurrentSaved ? 'bg-yellow-400/20 text-yellow-400' : 'bg-white/5 text-white/60 hover:text-cyan-400'}`}
                          >
                            <span>{isCurrentSaved ? '⭐' : '☆'}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{isCurrentSaved ? 'SAVED' : 'SAVE'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pb-12">
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !sourceText.trim()}
                    className="anime-button flex items-center gap-4 px-12 md:px-20 py-4 md:py-6 rounded-[2rem] text-white font-black text-lg md:text-xl uppercase tracking-widest disabled:opacity-30 active:scale-95"
                  >
                    <span>✨ TRANSLATE NOW ✨</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="portal-card overflow-hidden">
                 <VoiceView sourceLang={sourceLang} targetLang={targetLang} />
              </div>
            )}
          </>
        )}

        <div className="mt-8 md:mt-16">
          <HistoryList 
            history={mode === TranslatorMode.SAVED ? history.filter(h => h.isSaved) : history} 
            title={mode === TranslatorMode.SAVED ? "⭐ SAVED LIST" : "📜 HISTORY"}
            onClear={() => mode === TranslatorMode.SAVED ? setHistory(prev => prev.map(h => ({...h, isSaved: false}))) : setHistory([])} 
            onSelect={handleSelectHistory} 
            onToggleSave={toggleSave}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
