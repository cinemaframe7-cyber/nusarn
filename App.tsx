
import React, { useState, useEffect, useRef } from 'react';
import { Role, Message } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { streamChatResponse } from './services/geminiService';

type Theme = 'dark' | 'light' | 'nano';
type Protocol = 'direct' | 'proxy' | 'connecting' | 'error';

interface EnhancedMessage extends Message {
  sources?: { title: string; uri: string }[];
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [protocol, setProtocol] = useState<Protocol>('connecting');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check API Configuration on Load
  useEffect(() => {
    if (window.innerWidth > 1024) setSidebarOpen(true);
    
    const checkEnvironment = () => {
      // Safely check for the key
      const env = (import.meta as any).env;
      const key = process.env.API_KEY || env?.VITE_GEMINI_KEY;
      
      // Verification log (Safe for production: only logs presence, not the value)
      console.log("[System] API Key detected:", !!key);
      
      if (key && !key.includes("YOUR_API_KEY") && key !== 'undefined') {
        setProtocol('direct');
      } else {
        console.warn("[System] API Key missing or invalid. Falling back to Proxy mode.");
        setProtocol('proxy'); 
      }
    };
    
    checkEnvironment();
  }, []);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: EnhancedMessage = {
      id: Date.now().toString(),
      role: Role.USER,
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const assistantId = (Date.now() + 1).toString();
    const assistantPlaceholder: EnhancedMessage = {
      id: assistantId,
      role: Role.ASSISTANT,
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantPlaceholder]);

    try {
      await streamChatResponse(
        [...messages, userMessage], 
        (data) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantId ? { ...msg, content: data.text, sources: data.sources } : msg
            )
          );
        },
        (p) => setProtocol(p)
      );
    } catch (error: any) {
      console.error("Chat Error:", error);
      setProtocol('error');
      const errorMessage = `### ⚠️ কানেকশন সমস্যা\n\n**Error:** ${error.message || 'Unknown Error'}\n\n*নিশ্চিত করুন যে Render-এর Environment সেকশনে VITE_GEMINI_KEY সঠিকভাবে সেট করা আছে। সরাসরি কানেকশন কাজ না করলে প্রক্সি সার্ভার ব্যবহার করার চেষ্টা করা হচ্ছে।*`;
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantId ? { ...msg, content: errorMessage } : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const themeConfig = {
    dark: "bg-[#1a1a1a] text-white",
    light: "bg-[#f8fafc] text-zinc-900",
    nano: "bg-transparent text-white"
  };

  return (
    <div className={`flex h-screen overflow-hidden relative ${themeConfig[theme]}`}>
      {/* Sidebar */}
      <aside className={`fixed md:relative z-50 h-full border-r border-white/5 transition-all duration-300 flex flex-col ${theme === 'light' ? 'bg-white' : 'bg-[#121212]'} ${sidebarOpen ? 'w-[280px]' : 'w-0 overflow-hidden border-none'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg">N</div>
               <span className="font-bold text-xl tracking-tight">NOVA AI</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 opacity-50 hover:opacity-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          </div>
          <button 
            onClick={() => { setMessages([]); if(window.innerWidth < 1024) setSidebarOpen(false); }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all text-sm font-bold border ${
                theme === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            New Session
          </button>
        </div>
        <div className="flex-1 px-4 overflow-y-auto custom-scrollbar">
           <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest px-4 mb-4 opacity-40">Appearance</p>
              <div className="space-y-1">
                {['dark', 'light', 'nano'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t as Theme)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${theme === t ? 'bg-indigo-500/10 text-indigo-400' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)} Mode
                  </button>
                ))}
              </div>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center justify-between px-6 h-16 border-b border-white/5 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <span className="text-sm font-bold tracking-tight opacity-90 italic uppercase tracking-widest">Nova Core</span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              protocol === 'direct' ? 'bg-emerald-500' : 
              protocol === 'proxy' ? 'bg-amber-500' : 
              protocol === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {protocol === 'direct' ? 'Direct Node' : protocol === 'proxy' ? 'Relay Server' : protocol === 'error' ? 'System Warning' : 'Syncing...'}
            </span>
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full p-8 text-center animate-in fade-in zoom-in duration-700">
               <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mb-8 rotate-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              </div>
              <h2 className="text-4xl font-black tracking-tighter mb-4">স্বাগতম, আমি NOVA</h2>
              <p className="text-sm font-medium opacity-40 uppercase tracking-[0.2em] mb-12">System status: {protocol === 'direct' ? 'Stable High Speed' : 'Relay Mode active'}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[600px]">
                {["একটি আধুনিক ওয়েবসাইট ডিজাইন করো", "বাজেট প্ল্যানিং-এ সাহায্য করো", "জটিল কোড ব্যাখ্যা করো", "সৃজনশীল গল্প লেখো"].map((txt, i) => (
                  <button key={i} onClick={() => handleSendMessage(txt)} className={`p-4 rounded-2xl border text-sm font-bold text-left transition-all hover:scale-[1.02] active:scale-95 ${theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    {txt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col pb-40 pt-8 max-w-4xl mx-auto w-full">
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} theme={theme} />
              ))}
              {isTyping && (
                <div className="flex justify-start px-10 mb-8">
                   <div className="flex gap-1.5 opacity-30">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                   </div>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className={`fixed bottom-0 left-0 right-0 p-4 transition-all duration-300 ${sidebarOpen ? 'md:left-[280px]' : 'left-0'}`}>
          <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} theme={theme} />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
