'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Send, Loader2, BookOpen } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ReceptPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || loading) return;

    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? '' },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nätverksfel');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Tillbaka"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-semibold text-lg">Recept från kokböcker</h1>
          </div>
        </div>
      </header>

      <p className="max-w-2xl mx-auto px-4 py-2 text-sm text-muted-foreground">
        Fråga recept baserat på upp till 50 svenska kokböcker (PDF). Svar ges av
        Gemini Flash utifrån utvalda utdrag.
      </p>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pb-6 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages.length === 0 && !error && (
            <div className="text-center text-muted-foreground text-sm py-8">
              T.ex. &quot;Recept för pannkakor&quot;, &quot;Vad behöver jag till
              köttbullar?&quot;, &quot;Svensk julmat&quot;
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2 max-w-[85%]'
                    : 'bg-muted rounded-2xl rounded-tl-md px-4 py-2 max-w-[85%]'
                }
              >
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Söker recept...
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Fråga om recept..."
            className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="rounded-xl bg-primary text-primary-foreground p-3 disabled:opacity-50 hover:enabled:opacity-90 transition-opacity"
            aria-label="Skicka"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </main>
    </div>
  );
}
