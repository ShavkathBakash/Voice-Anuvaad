
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

    // If there was text to translate, re-run translation with new settings
    if (oldTargetText) {
      // Small timeout to let state update settle
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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-transform hover:rotate-12 cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter">
              VOICE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">ANUVAAD</span>
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
              <span className="text-[8px] md:text-[9px] font-bold text-cyan-400/80 uppercase tracking-[0.2em]">Universal AI Relay</span>
            </div>
          </div>
        </div>
        
        <nav className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: TranslatorMode.TEXT, label: '⌨️ TEXT', icon: <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /> },
            { id: TranslatorMode.VOICE, label: '🎙️ VOICE', icon: <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z M19 10v2a7 7 0 01-14 0v-2 M12 18v4 M8 22h8" /> },
            { id: TranslatorMode.SAVED, label: '⭐ SAVED', icon: <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /> }
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
                <LanguageSelector label="🏁 FROM (Input)" value={sourceLang} onChange={setSourceLang} />
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
                <LanguageSelector label="🚩 TO (Output)" value={targetLang} onChange={setTargetLang} />
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
                            {translatedText || "AI will translate here..."}
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
