'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { askAi, fetchAiSuggestions } from '@/store/aiSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Send } from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

export default function AssistentePage() {
  const dispatch = useAppDispatch();
  const { suggestions, history, loading, error } = useAppSelector((state) => state.ai);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    void dispatch(fetchAiSuggestions());
  }, [dispatch]);

  async function submit(value = question) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setQuestion('');
    await dispatch(askAi(trimmed));
  }

  return (
    <>
      <PageHeader
        title="Assistente IA"
        description="Consultas naturais sobre financeiro, documentos, tarefas e CRM"
        actions={
          <Button disabled={loading || !question.trim()} onClick={() => submit()}>
            <Send className="h-4 w-4" />
            Perguntar
          </Button>
        }
      />

      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void submit();
                }}
                placeholder="Pergunte: quem esta me devendo?"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <Button
                  key={item}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => submit(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          {history.map((entry) => (
            <Card key={`${entry.generatedAt}-${entry.intent}`}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{entry.intent}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(entry.generatedAt)}</span>
                </div>
                <p className="text-sm leading-6">{entry.answer}</p>
              </CardContent>
            </Card>
          ))}
          {history.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                As respostas aparecem aqui.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
