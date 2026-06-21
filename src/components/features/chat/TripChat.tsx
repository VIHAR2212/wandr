'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TripFormData } from '@/types';

interface Message { id: string; role: 'user' | 'assistant'; content: string; ts: Date; }

const QUICK_PROMPTS = [
  'What should I pack for this trip?',
  'Are there any safety concerns I should know?',
  'What are the best local foods to try?',
  'What if my flight gets delayed?',
  'How do I get from the airport to my hotel?',
  'What are the best photo spots?',
];

export function TripChat({ tripId: _tripId, tripContext }: { tripId: string; tripContext: TripFormData }) {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: `Hi! I'm your Wandr AI travel assistant for your trip to **${tripContext.destination}**. I know your complete itinerary, budget, and preferences. Ask me anything — from last-minute packing tips to what to do if your train is delayed. 🧳`,
    ts: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text?: string) {
    const content = text ?? input.trim();
    if (!content || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, tripContext }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[TripChat] API error:', res.status, errText);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(), role: 'assistant',
          content: `Server error (${res.status}). Please try again.`, ts: new Date(),
        }]);
        return;
      }

      const data = await res.json();
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I had trouble responding. Please try again.',
        ts: new Date(),
      };
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      console.error('[TripChat] Network error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: 'Network error. Please try again.', ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }

  function renderContent(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <div className="glass-card flex flex-col" style={{ height: '620px' }}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="font-semibold text-foreground text-sm">Wandr AI Assistant</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-forest-400 inline-block" />
            Online · Knows your trip
          </div>
        </div>
        <div className="ml-auto">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn('flex items-start gap-3', msg.role === 'user' && 'flex-row-reverse')}
            >
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                msg.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
              )}>
                {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'assistant'
                  ? 'glass-panel rounded-tl-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-sm'
              )}>
                <div dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
                <div className={cn('text-xs mt-1', msg.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/60')}>
                  {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length < 3 && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 pt-0">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask anything about your trip…"
            className="glass-input flex-1"
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
