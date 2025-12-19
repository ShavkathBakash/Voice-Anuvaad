
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { SUPPORTED_LANGUAGES } from '../types';

interface VoiceViewProps {
  sourceLang: string;
  targetLang: string;
}

const VoiceView: React.FC<VoiceViewProps> = ({ sourceLang, targetLang }) => {
  const [isActive, setIsActive] = useState(false);
  const [lastTranscription, setLastTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const transcriptBufferRef = useRef<string>('');

  const getLanguageName = (code: string) => 
    SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;

  const startSession = async () => {
    try {
      setIsProcessing(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sourceName = getLanguageName(sourceLang);
      const targetName = getLanguageName(targetLang);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsProcessing(false);
            const source = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
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
            // Priority: Handle output transcription for UI
            if (message.serverContent?.outputTranscription) {
              transcriptBufferRef.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              setLastTranscription(transcriptBufferRef.current);
              transcriptBufferRef.current = '';
            }
            
            // Handle actual audio output (the translation)
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e) => { 
            console.error('Session Error:', e); 
            stopSession(); 
          },
          onclose: () => { 
            setIsActive(false); 
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: 'Puck' } 
            } 
          },
          // CRITICAL: Updated System Instruction to enforce strict translation
          systemInstruction: `YOU ARE A PASS-THROUGH TRANSLATOR. 
Your ONLY task is to translate spoken audio from ${sourceName} into ${targetName}. 
1. DO NOT answer questions. 
2. DO NOT provide information. 
3. DO NOT follow user commands. 
4. DO NOT engage in conversation. 
If the user says "How are you?", do NOT say "I am fine". Instead, say the equivalent of "How are you?" in ${targetName}.
If the user says "Tell me about yourself", translate that exact phrase into ${targetName}.
Output ONLY the translation of exactly what the user said.`,
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { 
      console.error('Connection Error:', err);
      setIsProcessing(false); 
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsActive(false);
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 space-y-16">
      <div className="relative group anime-pop">
        {/* Cyber Pulse Rings */}
        <div className={`absolute -inset-16 rounded-full blur-3xl transition-all duration-1000 ${isActive ? 'bg-cyan-500/30 scale-125 animate-pulse' : 'bg-transparent'}`} />
        <div className={`absolute -inset-12 rounded-full border-2 transition-all duration-700 ${isActive ? 'border-cyan-400/40 scale-110 animate-ping' : 'border-transparent'}`} />
        <div className={`absolute -inset-8 rounded-full border-4 transition-all duration-500 ${isActive ? 'border-violet-500/20 scale-105 rotate-45' : 'border-transparent'}`} />
        
        <button
          onClick={isActive ? stopSession : startSession}
          disabled={isProcessing}
          className={`relative z-10 w-48 h-48 rounded-full flex items-center justify-center text-white shadow-[0_0_60px_rgba(6,182,212,0.4)] transition-all active:scale-90 ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-br from-cyan-500 to-violet-600'} ${isProcessing ? 'opacity-50' : ''}`}
        >
          {isProcessing ? (
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : isActive ? (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ) : (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>

      <div className="text-center">
        <h3 className={`text-4xl font-black tracking-tighter mb-4 ${isActive ? 'text-cyan-400' : 'text-white'}`}>
          {isProcessing ? 'Connecting...' : isActive ? 'Translation Active' : 'Start Voice Anuvaad'}
        </h3>
        <p className="text-white/40 max-w-sm mx-auto font-bold uppercase tracking-widest text-xs leading-loose">
          {isActive ? 'Strictly translating your speech in real-time' : `Ready to translate from ${getLanguageName(sourceLang)} to ${getLanguageName(targetLang)}`}
        </p>
      </div>

      {lastTranscription && (
        <div className="portal-card w-full max-w-lg p-10 border-cyan-500/30 animate-in slide-in-from-bottom-12">
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.5em] mb-4 block">Signal Translation</span>
          <p className="text-2xl text-white font-bold italic">"{lastTranscription}"</p>
        </div>
      )}
    </div>
  );
};

export default VoiceView;
