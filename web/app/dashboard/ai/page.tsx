'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { askAi, fetchAiSuggestions } from '@/store/aiSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bot, Send, Sparkles, User } from 'lucide-react';

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function AiPage() {
  const dispatch = useAppDispatch();
  const { suggestions, history, loading } = useAppSelector((s) => s.ai);
  const [question, setQuestion] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void dispatch(fetchAiSuggestions());
  }, [dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  async function handleAsk(q: string) {
    if (!q.trim()) return;
    setQuestion('');
    await dispatch(askAi(q.trim()));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void handleAsk(question);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-6">
      <PageHeader
        title="Assistente Financeiro"
        description="Faça perguntas sobre seu fluxo de caixa, cobranças e despesas."
      />

      {/* Chat area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {history.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">Como posso ajudar?</p>
                <p className="mt-1 text-sm text-gray-500">
                  Pergunte sobre recebimentos, despesas, inadimplência e muito mais.
                </p>
              </div>

              {suggestions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 px-8">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => void handleAsk(s)}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {[...history].reverse().map((entry, i) => (
              <div key={i} className="flex flex-col gap-2">
                {/* Pergunta do usuário */}
                <div className="flex items-start justify-end gap-2">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-primary px-4 py-2 text-sm text-primary-foreground">
                    {entry.intent}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                {/* Resposta da IA */}
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <Bot className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-gray-100 px-4 py-2 text-sm text-gray-800">
                    <p className="whitespace-pre-wrap">{entry.answer}</p>
                    <p className="mt-1 text-right text-xs text-gray-400">{fmtTime(entry.generatedAt)}</p>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Bot className="h-4 w-4 text-gray-600" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-gray-100 px-4 py-2 text-sm text-gray-500">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce [animation-delay:0.2s]">.</span>
                    <span className="animate-bounce [animation-delay:0.4s]">.</span>
                  </span>
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          {suggestions.length > 0 && history.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => void handleAsk(s)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Pergunte algo sobre suas finanças..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !question.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
