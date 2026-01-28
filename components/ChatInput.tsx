
import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  theme: 'dark' | 'light' | 'nano';
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled, theme }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Ensure height is at least 56px and fits content up to 200px
      textareaRef.current.style.height = `${Math.max(56, Math.min(scrollHeight, 200))}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = '56px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const containerStyles = {
    dark: "bg-[#2f2f2f] border-[#424242] focus-within:border-zinc-500 shadow-2xl",
    light: "bg-white border-zinc-200 shadow-xl focus-within:border-indigo-500",
    nano: "bg-black/50 backdrop-blur-3xl border-white/20 focus-within:border-white/50 shadow-2xl"
  };

  const textStyles = {
    dark: "text-white placeholder-zinc-500",
    light: "text-zinc-900 placeholder-zinc-400",
    nano: "text-white placeholder-white/30"
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6">
      <div className={`relative flex items-center border rounded-[30px] transition-all duration-300 ${containerStyles[theme]}`}>
        {/* Attachment/Plus Icon */}
        <div className="pl-5 pr-2 h-[56px] flex items-center">
          <button className={`p-2 transition-all rounded-full hover:bg-white/10 ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500 hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Direct Neural Link Active..."
          disabled={disabled}
          className={`flex-1 bg-transparent border-none focus:ring-0 resize-none py-[15px] px-2 text-[17px] font-semibold leading-[26px] max-h-[200px] custom-scrollbar overflow-y-auto ${textStyles[theme]}`}
          style={{ minHeight: '56px', display: 'flex', alignItems: 'center' }}
        />

        {/* Send Action */}
        <div className="pr-5 flex items-center h-[56px] self-end mb-0.5">
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className={`p-2.5 rounded-2xl transition-all duration-300 transform active:scale-90 ${
              text.trim() && !disabled
                ? (theme === 'light' ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white text-black shadow-xl')
                : 'bg-zinc-800/40 text-zinc-600 cursor-not-allowed opacity-10'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
          </button>
        </div>
      </div>
      <div className="text-center mt-3">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">NOVA Core v3.0 | Direct Protocol</p>
      </div>
    </div>
  );
};
