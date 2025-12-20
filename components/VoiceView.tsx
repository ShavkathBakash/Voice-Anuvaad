
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { SUPPORTED_LANGUAGES } from '../types';

interface VoiceViewProps {
  sourceLang: string;
  targetLang: string;
}

const VoiceView: React.FC<VoiceViewProps> = ({ sourceLang, targetLang }) => {
  const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'TRANSLATING' | 'PLAYING'>('IDLE');
  const [lastTranscription, setLastTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const transcriptBufferRef = useRef<string>('');
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const lastAudioChunksRef = useRef<Uint8Array[]>([]);
  const currentTurnAudioRef = useRef<Uint8Array[]>([]);

  const getLanguageName = (code: string) => 
    SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;

  // Cleanup function to stop current session
  const stopSession = useCallback(() => {
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStatus('IDLE');
    setInputLevel(0);
    // Stop all audio playback sources
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
  }, []);

  const startSession = useCallback(async () => {
    try {
      setError(null);
      setStatus('LISTENING');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 16000 } 
      });

      const sourceName = getLanguageName(sourceLang);
      const targetName = getLanguageName(targetLang);

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      source.connect(analyserRef.current);

      const updateLevel = () => {
        if (!analyserRef.current || status === 'IDLE') return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        setInputLevel(sum / dataArray.length);
        if (status !== 'IDLE') requestAnimationFrame(updateLevel);
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            updateLevel();
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              transcriptBufferRef.current += message.serverContent.outputTranscription.text;
              setStatus('TRANSLATING');
            }
            if (message.serverContent?.turnComplete) {
              setLastTranscription(transcriptBufferRef.current);
              transcriptBufferRef.current = '';
              setStatus('LISTENING');
              lastAudioChunksRef.current = [...currentTurnAudioRef.current];
              currentTurnAudioRef.current = [];
            }
            
            const audioDataStr = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioDataStr && outputAudioContextRef.current) {
              const decoded = decode(audioDataStr);
              currentTurnAudioRef.current.push(decoded);
              
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decoded, ctx, 24000, 1);
              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = buffer;
              sourceNode.connect(ctx.destination);
              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(sourceNode);
              sourceNode.onended = () => sourcesRef.current.delete(sourceNode);
            }
          },
          onerror: (e) => { 
            console.error('Session error', e);
            setError('Connection glitch. Restarting...');
            stopSession();
          },
          onclose: () => { 
            setStatus('IDLE'); 
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: `You are a translator from ${sourceName} to ${targetName}. Listen for voices nearby. Ignore background noises. Speak only the translation.`,
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { 
      setError('Mic access denied.');
      setStatus('IDLE'); 
    }
  }, [sourceLang, targetLang, stopSession]);

  // CRITICAL FIX: Restart session automatically when languages change while active
  useEffect(() => {
    if (status !== 'IDLE') {
      stopSession();
      // Delay slightly to allow resources to release before re-acquiring
      const timeout = setTimeout(() => {
        startSession();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [sourceLang, targetLang]); // Watch for language changes

  const replayTranslation = async () => {
    if (lastAudioChunksRef.current.length === 0 || !outputAudioContextRef.current) return;
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    const ctx = outputAudioContextRef.current;
    let offset = ctx.currentTime + 0.1;
    setIsPlaybackActive(true);
    for (const chunk of lastAudioChunksRef.current) {
      const buffer = await decodeAudioData(chunk, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(offset);
      offset += buffer.duration;
      sourcesRef.current.add(source);
      source.onended = () => {
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0) setIsPlaybackActive(false);
      };
    }
  };

  const getStatusDisplay = () => {
    switch(status) {
      case 'LISTENING': return { label: '🔴 RECORDING', color: 'bg-red-500' };
      case 'TRANSLATING': return { label: '⚡ TRANSLATING', color: 'bg-cyan-400' };
      default: return { label: '⚪ READY / IDLE', color: 'bg-white/20' };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-20 px-4 md:px-8 space-y-10">
      <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 shadow-lg">
        <div className={`w-3 h-3 rounded-full ${status === 'LISTENING' ? 'animate-pulse' : status === 'TRANSLATING' ? 'animate-spin' : ''} ${statusInfo.color}`} />
        <span className="text-[11px] font-black tracking-[0.2em] uppercase text-white flex items-center gap-2">
           {statusInfo.label}
        </span>
      </div>

      <div className="relative group">
        <div className={`absolute -inset-12 md:-inset-20 rounded-full blur-3xl transition-all duration-1000 
          ${status === 'LISTENING' ? 'bg-red-500/30 scale-110 animate-pulse' : 
            status === 'TRANSLATING' ? 'bg-violet-500/30 scale-125 rotate-45 animate-pulse' : 'bg-transparent'}`} 
        />
        
        <button
          onClick={status === 'IDLE' ? startSession : stopSession}
          className={`relative z-10 w-44 h-44 md:w-60 md:h-60 rounded-full flex flex-col items-center justify-center text-white transition-all active:scale-95 shadow-2xl
            ${status === 'IDLE' ? 'bg-gradient-to-br from-cyan-500 to-violet-600' : 'bg-red-500'}`}
        >
          <div className="text-6xl md:text-8xl mb-4">
            {status === 'IDLE' ? '🎙️' : '⏹️'}
          </div>
          <span className="text-[12px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
            {status === 'IDLE' ? '▶️ START VOICE' : '⏹️ STOP VOICE'}
          </span>
          {status === 'LISTENING' && (
             <div className="mt-2 text-[10px] font-bold text-white/60 animate-bounce tracking-widest">
               🗣️ TALK NOW
             </div>
          )}
        </button>
      </div>

      <div className="text-center">
        {error && <p className="text-red-400 font-bold uppercase text-[10px] mb-4 tracking-widest animate-pulse">⚠️ {error}</p>}
        <div className="flex items-center justify-center gap-4 text-white font-bold uppercase tracking-[0.2em] text-xs bg-white/5 px-6 py-2 rounded-xl">
          <span className="opacity-60">{getLanguageName(sourceLang)}</span>
          <span className="text-cyan-400 text-xl">➔</span>
          <span className="opacity-100">{getLanguageName(targetLang)}</span>
        </div>
      </div>

      {lastTranscription && (
        <div className="w-full max-w-lg space-y-4 animate-in slide-in-from-bottom-8">
          <div className="portal-card p-6 md:p-8 border-cyan-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">TRANSLATED SPEECH</span>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={replayTranslation}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-xl transition-all font-black text-[10px] tracking-widest ${isPlaybackActive ? 'bg-cyan-500 text-white shadow-lg scale-105' : 'bg-white/10 text-white/60 hover:text-cyan-400'}`}
                >
                  <span>{isPlaybackActive ? '⏸️ PAUSE' : '▶️ PLAY AGAIN'}</span>
                </button>
              </div>
            </div>
            
            <p className="text-xl md:text-2xl text-white font-bold italic leading-tight p-4 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
              "{lastTranscription}"
            </p>
            
            {isPlaybackActive && (
              <div className="mt-8 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 animate-progress origin-left" />
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 2.5s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default VoiceView;
