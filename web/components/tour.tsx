'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, ChevronLeft, X, CheckCircle2, MousePointerClick,
  Sparkles, PlayCircle,
} from 'lucide-react';

const TOUR_KEY = 'granazen-tour-done';

interface Step {
  id: string;
  title: string;
  body: string;
  target: string | null;         // CSS selector
  targetPad?: number;            // extra padding around spotlight
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  actionLabel?: string;          // label do botão de ação interativa
  actionEvent?: string;          // window CustomEvent a disparar
  actionRoute?: string;          // rota a navegar ao clicar
  skipNext?: boolean;            // se a ação já avança automaticamente
  emoji?: string;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Olá! Vamos começar seu tour',
    body: 'Em menos de 2 minutos você vai aprender a usar tudo. Vou te mostrar cada parte e pedir que você interaja. Clique em "Começar" para continuar.',
    target: null,
    tooltipSide: 'center',
    emoji: '👋',
  },
  {
    id: 'quick-add',
    title: 'O botão mais importante',
    body: 'Este botão verde é sua maior ferramenta. Clique nele AGORA para registrar um gasto ou uma receita — leva só 10 segundos!',
    target: '[data-tour="quick-add"]',
    targetPad: 12,
    tooltipSide: 'top',
    actionLabel: 'Clicar no botão agora',
    actionEvent: 'tour:open-quick-add',
    skipNext: true,
    emoji: '💚',
  },
  {
    id: 'saldo',
    title: 'Seu saldo do mês',
    body: 'Este card mostra quanto dinheiro sobrou (verde) ou faltou (vermelho) no mês. Basta olhar aqui para saber se suas finanças estão bem!',
    target: '[data-tour="saldo"]',
    targetPad: 8,
    tooltipSide: 'bottom',
    emoji: '💰',
  },
  {
    id: 'categorias',
    title: 'Para onde vai o dinheiro',
    body: 'Aqui você vê em quais categorias gastou mais — mercado, transporte, saúde etc. As barras mostram rapidinho o que mais pesa no bolso.',
    target: '[data-tour="categorias"]',
    targetPad: 8,
    tooltipSide: 'bottom',
    emoji: '📊',
  },
  {
    id: 'carteira',
    title: 'Conecte seu banco',
    body: 'Na Carteira você conecta seu banco real (Nubank, Itaú, Bradesco...) e o saldo aparece automático. Clique para conhecer essa área!',
    target: '[data-tour="nav-carteira"]',
    targetPad: 6,
    tooltipSide: 'right',
    actionLabel: 'Ir até Carteira',
    actionRoute: '/dashboard/carteira',
    emoji: '🏦',
  },
  {
    id: 'relatorios',
    title: 'Veja seus relatórios',
    body: 'Em Relatórios você encontra gráficos do mês, comparações com meses anteriores e pode baixar tudo em PDF para guardar ou mostrar para alguém.',
    target: '[data-tour="nav-relatorios"]',
    targetPad: 6,
    tooltipSide: 'right',
    actionLabel: 'Ver Relatórios',
    actionRoute: '/dashboard/relatorios',
    emoji: '📄',
  },
  {
    id: 'done',
    title: 'Você aprendeu tudo!',
    body: 'Agora você sabe usar o sistema. Lembre-se: o botão verde no canto inferior direito é seu melhor amigo — use-o sempre que movimentar dinheiro.',
    target: null,
    tooltipSide: 'center',
    emoji: '🎉',
  },
];

interface SpotlightRect { top: number; left: number; width: number; height: number }

function useSpotlight(selector: string | null, pad = 8) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!selector) { setRect(null); return; }

    function update() {
      const el = document.querySelector(selector!);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
    }

    update();
    const id = setInterval(update, 200);
    window.addEventListener('resize', update);
    return () => { clearInterval(id); window.removeEventListener('resize', update); };
  }, [selector, pad]);

  return rect;
}

function Tooltip({ step, rect, onNext, onPrev, onSkip, stepIdx, total, loading }:
  { step: Step; rect: SpotlightRect | null; onNext: () => void; onPrev: () => void; onSkip: () => void; stepIdx: number; total: number; loading: boolean }) {

  const isFirst  = stepIdx === 0;
  const isLast   = stepIdx === total - 1;
  const centered = step.tooltipSide === 'center' || !rect;

  const style: React.CSSProperties = centered
    ? { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', maxWidth: 340, width: 'calc(100vw - 32px)' }
    : (() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const TW = 320;
        const side = step.tooltipSide ?? 'bottom';

        let top = 0, left = 0;
        if (side === 'bottom') {
          top  = rect.top + rect.height + 16;
          left = Math.min(Math.max(rect.left + rect.width / 2 - TW / 2, 12), vw - TW - 12);
        } else if (side === 'top') {
          top  = rect.top - 16 - 180;
          left = Math.min(Math.max(rect.left + rect.width / 2 - TW / 2, 12), vw - TW - 12);
        } else if (side === 'right') {
          top  = Math.min(rect.top, vh - 260);
          left = rect.left + rect.width + 16;
          if (left + TW > vw - 12) left = rect.left - TW - 16;
        } else {
          top  = Math.min(rect.top, vh - 260);
          left = rect.left - TW - 16;
          if (left < 12) left = rect.left + rect.width + 16;
        }
        top = Math.max(12, Math.min(top, vh - 270));
        return { position: 'fixed', top, left, width: TW };
      })();

  return (
    <div
      className="z-[10001] rounded-2xl bg-white shadow-2xl overflow-hidden"
      style={{ ...style, animation: 'tourFadeIn 0.25s ease' }}
    >
      {/* Barra de progresso */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${((stepIdx + 1) / total) * 100}%` }}
        />
      </div>

      <div className="p-5">
        {/* Emoji + título */}
        <div className="mb-3 flex items-start gap-3">
          <span className="text-2xl leading-none">{step.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-900">{step.title}</h3>
              <button onClick={onSkip} className="flex-shrink-0 text-gray-300 hover:text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400">Passo {stepIdx + 1} de {total}</p>
          </div>
        </div>

        {/* Corpo */}
        <p className="mb-4 text-sm text-gray-600 leading-relaxed">{step.body}</p>

        {/* Ação interativa */}
        {step.actionLabel && (
          <button
            onClick={onNext}
            disabled={loading}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <MousePointerClick className="h-4 w-4" />
            {loading ? 'Aguarde...' : step.actionLabel}
          </button>
        )}

        {/* Navegação */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {!step.actionLabel && (
            <button
              onClick={onNext}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-gray-800"
            >
              {isLast ? (
                <><CheckCircle2 className="h-4 w-4" /> Concluir</>
              ) : (
                <>Próximo <ChevronRight className="h-4 w-4" /></>
              )}
            </button>
          )}
          {step.actionLabel && !isLast && (
            <button onClick={onNext} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">
              Pular este passo
            </button>
          )}
        </div>

        {/* Pontos de progresso */}
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIdx ? 'w-4 bg-indigo-500' : 'w-1.5 bg-gray-200'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function Tour() {
  const router = useRouter();
  const [active, setActive]     = useState(false);
  const [step, setStep]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [confetti, setConfetti] = useState(false);
  const listenRef               = useRef(false);

  const current   = STEPS[step];
  const spotlight = useSpotlight(current.target, current.targetPad ?? 8);

  // Verificar se já fez o tour
  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      // Pequeno delay para a página carregar
      const t = setTimeout(() => setActive(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  // Scroll para o elemento alvo
  useEffect(() => {
    if (!current.target) return;
    const el = document.querySelector(current.target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step, current.target]);

  // Ouvir quando QuickAdd fecha (para avançar automaticamente)
  useEffect(() => {
    if (listenRef.current) return;
    listenRef.current = true;
    const handler = () => {
      setStep(s => {
        const cur = STEPS[s];
        if (cur.id === 'quick-add') return s + 1;
        return s;
      });
    };
    window.addEventListener('tour:quick-add-opened', handler);
    return () => window.removeEventListener('tour:quick-add-opened', handler);
  }, []);

  const advance = useCallback(async () => {
    const cur = STEPS[step];

    if (cur.actionEvent) {
      setLoading(true);
      window.dispatchEvent(new CustomEvent(cur.actionEvent));
      await new Promise(r => setTimeout(r, 400));
      setLoading(false);
      if (cur.skipNext) return; // QuickAdd listener irá avançar
    }

    if (cur.actionRoute) {
      router.push(cur.actionRoute);
      // Avança o step mas mantém tour ativo
    }

    const next = step + 1;
    if (next >= STEPS.length) {
      finishTour();
    } else {
      setStep(next);
    }
  }, [step, router]);

  const back = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  function finishTour() {
    setConfetti(true);
    setTimeout(() => {
      setActive(false);
      setConfetti(false);
      localStorage.setItem(TOUR_KEY, 'true');
    }, 2000);
  }

  function skipTour() {
    setActive(false);
    localStorage.setItem(TOUR_KEY, 'true');
  }

  if (!active && !confetti) {
    return (
      <button
        onClick={() => { setStep(0); setActive(true); }}
        title="Abrir tutorial"
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-700 md:bottom-28 md:right-8"
        style={{ animation: 'tourPulse 3s ease-in-out infinite' }}
      >
        <PlayCircle className="h-4 w-4" />
        Tutorial
      </button>
    );
  }

  return (
    <>
      {/* Estilos de animação */}
      <style>{`
        @keyframes tourFadeIn { from { opacity:0; transform: translateY(8px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes tourPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); } 50% { box-shadow: 0 0 0 8px rgba(99,102,241,0); } }
        @keyframes tourSpotPulse { 0%,100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 3px rgba(99,102,241,0.6); } 50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 6px rgba(99,102,241,0.8); } }
        @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity:1; } 100% { transform: translateY(100vh) rotate(720deg); opacity:0; } }
      `}</style>

      {/* Overlay geral (sem spotlight) */}
      {!spotlight && (
        <div className="fixed inset-0 z-[9998] bg-black/70" onClick={skipTour} />
      )}

      {/* Spotlight animado sobre o elemento */}
      {spotlight && (
        <div
          className="fixed z-[9998] pointer-events-none rounded-xl"
          style={{
            top:    spotlight.top,
            left:   spotlight.left,
            width:  spotlight.width,
            height: spotlight.height,
            animation: 'tourSpotPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip */}
      <Tooltip
        step={current}
        rect={spotlight}
        onNext={advance}
        onPrev={back}
        onSkip={skipTour}
        stepIdx={step}
        total={STEPS.length}
        loading={loading}
      />

      {/* Confetti no final */}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-[10002] overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-3 w-3 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'][i % 6],
                animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
              <div className="mb-3 text-5xl">🎉</div>
              <h2 className="text-xl font-bold text-gray-900">Parabéns!</h2>
              <p className="mt-2 text-sm text-gray-500">Você concluiu o tutorial com sucesso!</p>
            </div>
          </div>
        </div>
      )}

      {/* Botão Sparkles para reiniciar tour (canto superior) */}
      {active && (
        <button
          onClick={skipTour}
          className="fixed right-4 top-4 z-[10002] flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-md hover:bg-white"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Pular tutorial
        </button>
      )}
    </>
  );
}
