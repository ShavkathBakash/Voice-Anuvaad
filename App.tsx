
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

  // Load history from local storage on mount
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

  // Save history to local storage whenever it changes
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

  const downloadTranslation = () => {
    if (!translatedText) return;
    const content = `Source (${sourceLang}): ${sourceText}\nTranslation (${targetLang}): ${translatedText}`;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `voice_anuvaad_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    const temp = sourceText;
    setSourceText(translatedText);
    setTranslatedText(temp);
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
      {/* Dynamic Header */}
      <header className="glass-nav sticky top-0 z-50 px-8 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-transform hover:rotate-12 cursor-pointer">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">
              VOICE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">ANUVAAD</span>
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-[0.3em]">Neural Translation Engine</span>
            </div>
          </div>
        </div>
        
        <nav className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          {[
            { id: TranslatorMode.TEXT, label: 'TEXT' },
            { id: TranslatorMode.VOICE, label: 'LIVE' },
            { id: TranslatorMode.SAVED, label: 'SAVED' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setMode(tab.id as TranslatorMode)}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${mode === tab.id ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-slate-400 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto pt-12 px-8">
        {mode !== TranslatorMode.SAVED && (
          <>
            <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-8 mb-12">
              <div className="portal-card p-4">
                <LanguageSelector 
                  label="Source Origin" 
                  value={sourceLang} 
                  onChange={setSourceLang} 
                  className="!text-white"
                />
              </div>
              
              <button 
                onClick={swapLanguages}
                className="mb-2 p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all transform hover:rotate-180 duration-700 shadow-lg shadow-cyan-500/20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>

              <div className="portal-card p-4">
                <LanguageSelector 
                  label="Target Destination" 
                  value={targetLang} 
                  onChange={setTargetLang} 
                  className="!text-white"
                />
              </div>
            </div>

            {mode === TranslatorMode.TEXT ? (
              <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="portal-card group overflow-hidden">
                    <div className="p-8">
                      <textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Enter message to transmit..."
                        className="w-full h-64 bg-transparent outline-none text-2xl text-white placeholder-white/20 resize-none font-medium leading-tight custom-scrollbar"
                      />
                      <div className="flex justify-end mt-4">
                        {sourceText && (
                          <button onClick={() => setSourceText('')} className="text-white/30 hover:text-red-400 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="portal-card relative group overflow-hidden border-cyan-500/20 bg-cyan-500/[0.02]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
                    <div className="p-8 h-full flex flex-col">
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-6">Translation Stream</span>
                      {isTranslating ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 w-16 h-16 border-4 border-violet-500/20 border-b-violet-500 rounded-full animate-spin [animation-duration:1.5s]"></div>
                          </div>
                          <span className="text-xs font-bold text-cyan-400/60 uppercase tracking-widest animate-pulse">Syncing Neural Paths...</span>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                          <p className={`text-2xl leading-tight ${translatedText ? 'text-white font-bold' : 'text-white/20 italic'}`}>
                            {translatedText || "Awaiting signal input..."}
                          </p>
                        </div>
                      )}
                      {translatedText && !isTranslating && (
                        <div className="flex justify-end mt-4 gap-3">
                          <button 
                            onClick={() => currentId && toggleSave(currentId)}
                            className={`p-3 rounded-xl transition-all anime-pop ${isCurrentSaved ? 'bg-yellow-400/20 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'bg-white/5 text-white/60 hover:text-cyan-400'}`}
                            title={isCurrentSaved ? "Saved" : "Save Transmission"}
                          >
                            <svg className="w-5 h-5" fill={isCurrentSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          <button 
                            onClick={downloadTranslation}
                            className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-cyan-400 hover:bg-white/10 transition-all anime-pop"
                            title="Download as .txt"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => navigator.clipboard.writeText(translatedText)}
                            className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-cyan-400 hover:bg-white/10 transition-all anime-pop"
                            title="Copy to clipboard"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
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
                    className="anime-button px-20 py-6 rounded-[2rem] text-white font-black text-xl uppercase tracking-widest shadow-[0_20px_50px_rgba(6,182,212,0.3)] disabled:opacity-30 flex items-center gap-4 group hover:scale-105 active:scale-95"
                  >
                    Execute Translation
                    <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
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

        <div className="mt-16">
          {mode === TranslatorMode.SAVED ? (
            <HistoryList 
              history={history.filter(h => h.isSaved)} 
              title="Saved Transmissions"
              onClear={() => setHistory(prev => prev.map(h => ({...h, isSaved: false})))} 
              onSelect={handleSelectHistory} 
              onToggleSave={toggleSave}
            />
          ) : (
            <HistoryList 
              history={history} 
              title="Archive Log"
              onClear={() => setHistory([])} 
              onSelect={handleSelectHistory} 
              onToggleSave={toggleSave}
            />
          )}
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-8 py-20 text-center opacity-50">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-10"></div>
        <p className="text-xs font-bold tracking-[0.5em] text-white uppercase">Neural Network Interface • Gemini v2.5 • Voice Anuvaad</p>
      </footer>
    </div>
  );
};

export default App;
