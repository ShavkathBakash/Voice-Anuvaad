
import React from 'react';
import { SUPPORTED_LANGUAGES, Language } from '../types';

interface LanguageSelectorProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ label, value, onChange, className }) => {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-12 focus:ring-2 focus:ring-cyan-500/50 outline-none text-white font-bold cursor-pointer hover:bg-white/10 transition-all text-lg"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
              {lang.flag} {lang.name.toUpperCase()}
            </option>
          ))}
        </select>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;
