
import React from 'react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message & { sources?: { title: string; uri: string }[] };
  theme: 'dark' | 'light' | 'nano';
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, theme }) => {
  const isUser = message.role === Role.USER;

  const bubbleStyles = {
    dark: isUser ? "bg-[#343541] text-white border-zinc-700 shadow-md" : "bg-[#212121] text-zinc-100 border-zinc-800",
    light: isUser ? "bg-zinc-900 text-white border-black shadow-md" : "bg-zinc-100 text-zinc-800 border-zinc-200",
    nano: isUser ? "bg-indigo-600/40 backdrop-blur-md text-white border-white/20" : "bg-white/5 backdrop-blur-md text-white border-white/10"
  };

  return (
    <div className={`flex w-full px-4 mb-8 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className={`flex max-w-[85%] sm:max-w-[80%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
        <div className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110 ${
          isUser ? 'bg-indigo-600' : 'bg-emerald-600'
        }`}>
          {isUser ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          )}
        </div>

        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-5 py-3 rounded-[24px] text-[16px] font-medium leading-relaxed whitespace-pre-wrap border ${bubbleStyles[theme]} ${
            isUser ? 'rounded-tr-none' : 'rounded-tl-none'
          }`}>
            {message.content || (
              <div className="flex gap-1.5 py-2">
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            )}
            
            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[11px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-all border border-white/5 truncate max-w-[150px]"
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <span className="text-[9px] font-black opacity-30 px-3 tracking-[0.2em] uppercase">
            {isUser ? 'User' : 'Nova 3 Pro Core'}
          </span>
        </div>
      </div>
    </div>
  );
};
