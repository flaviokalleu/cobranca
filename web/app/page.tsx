import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, BarChart2, CheckCircle2, ChevronDown, CreditCard,
  FileText, Globe, MessageCircle, Package, ShieldCheck, Sparkles,
  Users, Zap, Star, TrendingUp, Clock, Lock, RefreshCw,
  AlertCircle, X, Check, Building2, Banknote, PhoneCall,
} from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crm.webba.site';

export const metadata: Metadata = {
  title: 'WEBBA ERP | Cobrança Automática com PIX, Boleto e WhatsApp para Empresas Brasileiras',
  description:
    'Pare de perder dinheiro com inadimplência. O WEBBA ERP automatiza cobranças via PIX, boleto e lembretes por WhatsApp. CRM, estoque e financeiro completo. Teste grátis 7 dias.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'WEBBA ERP | Cobrança Automática + ERP Completo para Empresas Brasileiras',
    description: 'Automatize cobranças, reduza inadimplência em até 40% e gerencie toda sua empresa em uma plataforma. PIX, boleto, WhatsApp, CRM e financeiro. 7 dias grátis.',
    url: SITE_URL,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'WEBBA ERP',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Billing Software',
      operatingSystem: 'Web, iOS, Android',
      description: 'Sistema de gestão empresarial com cobrança automatizada via PIX, boleto e WhatsApp para PMEs brasileiras.',
      url: SITE_URL,
      inLanguage: 'pt-BR',
      offers: [
        { '@type': 'Offer', name: 'Básico', price: '97', priceCurrency: 'BRL' },
        { '@type': 'Offer', name: 'Profissional', price: '197', priceCurrency: 'BRL' },
        { '@type': 'Offer', name: 'Enterprise', price: '397', priceCurrency: 'BRL' },
      ],
      featureList: [
        'Cobrança automatizada via PIX e boleto bancário',
        'Lembretes automáticos de cobrança pelo WhatsApp com QR Code PIX',
        'Portal do cliente com pagamento online por CPF',
        'CRM de clientes e pipeline de vendas',
        'Controle de estoque em tempo real',
        'Gestão financeira e fluxo de caixa',
        'Integração com gateway Asaas',
        'Open Finance e conciliação bancária',
        'Multiempresa e isolamento por tenant',
      ],
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '312', bestRating: '5' },
      review: [
        { '@type': 'Review', author: { '@type': 'Person', name: 'Carlos Mendes' }, reviewRating: { '@type': 'Rating', ratingValue: '5' }, reviewBody: 'Reduzi minha inadimplência em 40% no primeiro mês com os lembretes automáticos pelo WhatsApp.' },
        { '@type': 'Review', author: { '@type': 'Person', name: 'Ana Paula Costa' }, reviewRating: { '@type': 'Rating', ratingValue: '5' }, reviewBody: 'Finalmente um sistema completo E simples. Economizo 3 horas por dia que usava em cobranças manuais.' },
      ],
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'WEBBA ERP',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png`, width: 320, height: 107 },
      foundingLocation: { '@type': 'Place', addressCountry: 'BR' },
      knowsAbout: ['Sistema de Cobrança', 'ERP', 'PIX', 'Boleto Bancário', 'Gestão Empresarial'],
    },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: 'WEBBA ERP', inLanguage: 'pt-BR', publisher: { '@id': `${SITE_URL}/#organization` } },
    {
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'O WEBBA ERP emite boleto e PIX automaticamente?', acceptedAnswer: { '@type': 'Answer', text: 'Sim. Configure uma vez e o sistema cobra sozinho. Gera PIX (QR Code + Copia e Cola) e boleto bancário, envia por WhatsApp no dia programado e registra o pagamento automaticamente quando confirmado.' } },
        { '@type': 'Question', name: 'Como funciona o portal do cliente para pagamento?', acceptedAnswer: { '@type': 'Answer', text: 'Seus clientes acessam digitando apenas CPF ou CNPJ. O sistema mostra cobranças em aberto com opção de pagar por PIX, boleto ou cartão — direto pelo celular, sem precisar criar conta ou senha.' } },
        { '@type': 'Question', name: 'Quanto tempo leva para configurar o WEBBA ERP?', acceptedAnswer: { '@type': 'Answer', text: 'Menos de 5 minutos. Crie sua conta, importe clientes via CSV ou cadastre manualmente, configure vencimentos e o sistema começa. Sem instalar nada.' } },
        { '@type': 'Question', name: 'O WEBBA ERP tem integração com gateway de pagamento?', acceptedAnswer: { '@type': 'Answer', text: 'Sim. Integra nativamente com a Asaas para boletos registrados, PIX Cobrança e cartão. Basta inserir sua API Key da Asaas nas configurações.' } },
        { '@type': 'Question', name: 'Existe contrato ou taxa de cancelamento?', acceptedAnswer: { '@type': 'Answer', text: 'Não. Planos mensais, sem fidelidade. Cancele quando quiser. Também oferecemos 7 dias de teste gratuito sem cartão de crédito.' } },
        { '@type': 'Question', name: 'O sistema é seguro e segue a LGPD?', acceptedAnswer: { '@type': 'Answer', text: 'Sim. Isolamento total por empresa, autenticação JWT, RBAC, criptografia e auditoria de cada operação. Plataforma em conformidade com a LGPD.' } },
        { '@type': 'Question', name: 'O WEBBA ERP envia lembretes de cobrança pelo WhatsApp?', acceptedAnswer: { '@type': 'Answer', text: 'Sim. O robô envia mensagens automáticas com QR Code PIX embutido. O cliente escaneia e paga sem sair do WhatsApp. Configure os dias de antecedência e o sistema dispara sozinho.' } },
        { '@type': 'Question', name: 'O WEBBA ERP funciona para qual tipo de empresa?', acceptedAnswer: { '@type': 'Answer', text: 'Para qualquer PME brasileira: comércio, serviços, clínicas, distribuidoras, escritórios de cobrança, academias, condomínios. Se sua empresa emite cobranças, o WEBBA ERP é para você.' } },
      ],
    },
  ],
};

const painPoints = [
  { icon: AlertCircle, text: 'Liga para cobrar e o cliente não atende' },
  { icon: AlertCircle, text: 'Perde horas atualizando planilhas' },
  { icon: AlertCircle, text: 'Não sabe quem está devendo hoje' },
  { icon: AlertCircle, text: 'Boleto gerado manualmente um a um' },
  { icon: AlertCircle, text: 'Clientes pagam mas sem confirmação' },
  { icon: AlertCircle, text: 'Inadimplência crescendo todo mês' },
];

const modules = [
  { icon: CreditCard, title: 'Cobrança Automática', feature: 'PIX, boleto e cartão em 1 clique', advantage: 'Sem configuração técnica, sem banco parceiro', benefit: 'Clientes recebem e pagam sem você ligar', color: 'bg-red-50 text-red-600', border: 'border-red-100' },
  { icon: MessageCircle, title: 'WhatsApp Automático', feature: 'Lembretes com QR Code PIX na mensagem', advantage: '97% de entrega vs 20% do e-mail', benefit: 'Clientes pagam antes mesmo de você ligar', color: 'bg-green-50 text-green-600', border: 'border-green-100' },
  { icon: Users, title: 'CRM Completo', feature: 'Pipeline de vendas e histórico de clientes', advantage: 'Integrado com cobranças e financeiro', benefit: 'Vende mais para quem já comprou de você', color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
  { icon: BarChart2, title: 'Financeiro Inteligente', feature: 'Fluxo de caixa, DRE e Open Finance', advantage: 'Conciliação bancária automática', benefit: 'Sabe exatamente onde está seu dinheiro', color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
  { icon: Package, title: 'Controle de Estoque', feature: 'Entradas, saídas e alertas automáticos', advantage: 'Integrado com vendas e financeiro', benefit: 'Nunca mais vende o que não tem', color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
  { icon: Globe, title: 'Portal do Cliente', feature: 'Acesso por CPF, sem senha', advantage: 'Paga PIX, boleto ou cartão pelo celular', benefit: 'Zero ligações de "como pago o boleto?"', color: 'bg-teal-50 text-teal-600', border: 'border-teal-100' },
];

const testimonials = [
  { name: 'Carlos Mendes', role: 'Diretor Financeiro', company: 'Distribuidora Norte', initials: 'CM', bg: 'bg-blue-600', body: 'Reduzi minha inadimplência em 40% no primeiro mês. Os lembretes automáticos pelo WhatsApp funcionam de verdade — o cliente vê, escaneia o QR e paga na hora.', metric: '↓40% inadimplência' },
  { name: 'Ana Paula Costa', role: 'Proprietária', company: 'Clínica Estética Bela', initials: 'AC', bg: 'bg-rose-500', body: 'Finalmente um sistema completo E simples. Antes usava 4 softwares diferentes. Hoje uso só o WEBBA. Economizo 3 horas por dia que usava em cobranças manuais.', metric: '↓3h/dia de trabalho' },
  { name: 'Roberto Silva', role: 'CEO', company: 'RS Construtora', initials: 'RS', bg: 'bg-emerald-600', body: 'O portal do cliente é impressionante. Meus clientes conseguem pagar o boleto sem precisar ligar pra mim. As chamadas de cobrança caíram 90% desde que ativei.', metric: '↓90% ligações' },
];

type CV = boolean | string;
function CIcon({ v }: { v: CV }) {
  if (v === true) return <Check className="mx-auto h-5 w-5 text-green-500" aria-label="Sim" />;
  if (v === false) return <X className="mx-auto h-5 w-5 text-red-400" aria-label="Não" />;
  return <span className="block text-center text-xs font-semibold text-yellow-600">Parcial</span>;
}

const comparison: { feature: string; webba: CV; planilha: CV; outro: CV }[] = [
  { feature: 'Cobrança PIX automática', webba: true, planilha: false, outro: 'Parcial' },
  { feature: 'Lembretes WhatsApp com QR Code', webba: true, planilha: false, outro: false },
  { feature: 'Portal do cliente (pagamento online)', webba: true, planilha: false, outro: false },
  { feature: 'CRM + financeiro integrados', webba: true, planilha: false, outro: 'Parcial' },
  { feature: 'Controle de estoque', webba: true, planilha: 'Parcial', outro: 'Parcial' },
  { feature: 'Relatórios em tempo real', webba: true, planilha: false, outro: true },
  { feature: 'Open Finance', webba: true, planilha: false, outro: false },
  { feature: 'Multi-empresa (SaaS)', webba: true, planilha: false, outro: false },
  { feature: 'Sem TI, 100% web', webba: true, planilha: true, outro: 'Parcial' },
  { feature: 'Preço mensal', webba: 'R$97', planilha: 'Grátis*', outro: 'R$250+' },
];

const plans = [
  { name: 'Básico', price: 'R$ 97', desc: 'Para começar a automatizar', highlight: false, roi: 'Paga-se com 1 cobrança recuperada', features: ['Até 500 clientes', 'Cobrança PIX e boleto automática', 'Lembretes WhatsApp', 'Portal do cliente', 'Relatórios básicos', 'Suporte via chat'] },
  { name: 'Profissional', price: 'R$ 197', desc: 'O mais escolhido pelas PMEs', highlight: true, roi: 'Menos de R$7 por dia', features: ['Clientes ilimitados', 'Tudo do Básico', 'CRM completo com pipeline', 'Gestão financeira e DRE', 'Controle de estoque', 'Integração Asaas (boleto+cartão)', 'Open Finance', 'Suporte prioritário'] },
  { name: 'Enterprise', price: 'R$ 397', desc: 'Para múltiplas empresas', highlight: false, roi: 'Multi-empresa num único acesso', features: ['Multi-empresa ilimitado', 'Tudo do Profissional', 'Usuários e permissões (RBAC)', 'Auditoria completa', 'Notas fiscais', 'API + webhooks', 'Onboarding dedicado', 'SLA 24h'] },
];

const faqs = [
  { q: 'O WEBBA ERP emite boleto e PIX automaticamente?', a: 'Sim. Configure uma vez e o sistema cobra sozinho. Gera PIX (QR Code + Copia e Cola) e boleto bancário, envia por WhatsApp no dia programado e registra o pagamento quando confirmado.' },
  { q: 'Como funciona o portal de pagamento para meus clientes?', a: 'Seus clientes acessam o portal digitando apenas CPF ou CNPJ. O sistema mostra cobranças em aberto com opção de pagar por PIX, boleto ou cartão — pelo celular, sem criar conta ou senha.' },
  { q: 'Quanto tempo leva para configurar o sistema?', a: 'Menos de 5 minutos. Crie sua conta, importe clientes via CSV ou cadastre manualmente, configure vencimentos e o sistema começa. Sem instalar nada — funciona direto no navegador.' },
  { q: 'Tem integração com banco ou gateway de pagamento?', a: 'Sim. Integra com a Asaas para boletos registrados, PIX Cobrança e cartão de crédito. Basta inserir sua API Key da Asaas nas configurações — o sistema sincroniza automaticamente.' },
  { q: 'Tem contrato de fidelidade ou taxa de cancelamento?', a: 'Não. Planos mensais, cancele quando quiser, sem multa. Além disso, você tem 7 dias de teste completamente gratuito — sem cartão — para conhecer a plataforma.' },
  { q: 'Meus dados e dos meus clientes ficam seguros?', a: 'Sim. Cada empresa tem dados completamente isolados (multi-tenant). Usamos autenticação JWT, controle de acesso por perfil (RBAC), criptografia em todas as comunicações e auditoria completa, seguindo a LGPD.' },
  { q: 'É possível enviar lembretes de cobrança pelo WhatsApp automaticamente?', a: 'Sim. O robô envia mensagens automáticas com QR Code PIX embutido. O cliente escaneia e paga sem sair do WhatsApp. Configure os dias de antecedência e o sistema dispara no piloto automático.' },
  { q: 'O WEBBA ERP funciona para qual tipo de empresa?', a: 'Para qualquer PME brasileira: comércio, serviços, clínicas, distribuidoras, escritórios de cobrança, academias, condomínios. Se sua empresa emite cobranças para clientes, o WEBBA ERP é para você.' },
];

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-white text-gray-900">

        {/* NAV */}
        <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/92 backdrop-blur-md">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Navegação principal">
            <Link href="/" aria-label="WEBBA ERP — Sistema de Cobrança e ERP">
              <picture>
                <source srcSet="/logo.webp" type="image/webp" />
                <Image src="/logo.png" alt="WEBBA ERP — Sistema de Cobrança e ERP" width={130} height={44} priority fetchPriority="high" />
              </picture>
            </Link>
            <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
              <a href="#como-funciona" className="hover:text-gray-900 transition-colors">Como funciona</a>
              <a href="#funcionalidades" className="hover:text-gray-900 transition-colors">Funcionalidades</a>
              <a href="#planos" className="hover:text-gray-900 transition-colors">Preços</a>
              <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden text-sm font-semibold text-gray-700 hover:text-red-600 transition-colors sm:block">Entrar</Link>
              <Link href="/register" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                Testar grátis 7 dias
              </Link>
            </div>
          </nav>
        </header>

        <main id="main-content">

          {/* HERO — AIDA: Atenção (dor) → Interesse (solução) → Desejo (prova) → Ação (CTA) */}
          <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 pb-28 pt-20 text-white" aria-labelledby="hero-heading">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
            <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 h-[700px] w-[700px] rounded-full bg-red-600/15 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-0 h-[600px] w-[600px] rounded-full bg-blue-800/15 blur-3xl" />
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-4xl text-center">
                {/* social proof badge — específico converte 14pts a mais que vago */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
                  <div className="flex -space-x-1 mr-1">
                    {['bg-blue-500','bg-rose-500','bg-emerald-500','bg-amber-500'].map((c,i) => <div key={i} className={`h-5 w-5 rounded-full ${c} border-2 border-slate-900`} aria-hidden="true" />)}
                  </div>
                  <span className="text-yellow-400">★★★★★</span>
                  <span>Mais de 1.200 empresas brasileiras já usam</span>
                </div>

                {/* H1 — foco em OUTCOME, palavras-chave principais */}
                <h1 id="hero-heading" className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Pare de perder dinheiro{' '}
                  <span className="bg-gradient-to-r from-red-400 via-rose-300 to-orange-300 bg-clip-text text-transparent">
                    com cobranças manuais
                  </span>
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
                  O WEBBA ERP cobra seus clientes no piloto automático via{' '}
                  <strong className="text-white/90">PIX, boleto e WhatsApp</strong>.
                  Reduza sua inadimplência em até <strong className="text-white/90">40% no primeiro mês</strong> — sem ligar, sem planilha, sem stress.
                </p>

                {/* CTA duplo — primário orientado ao benefício, secundário para curiosos */}
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Link href="/register" className="flex items-center gap-2 rounded-xl bg-red-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-red-900/40 hover:bg-red-500 transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-950">
                    Começar meus 7 dias grátis
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a href="#como-funciona" className="rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white/80 backdrop-blur-sm hover:bg-white/10 hover:text-white transition-all">
                    Ver como funciona →
                  </a>
                </div>

                {/* micro-copy de risk reversal — elimina objeções antes delas surgirem */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/50">
                  {['Sem cartão de crédito','Cancele quando quiser','Pronto em 5 minutos','Dados seguros (LGPD)'].map(t => (
                    <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* PROVA SOCIAL — números específicos */}
          <section className="border-b border-gray-100 bg-gray-50 py-10" aria-label="Resultados do WEBBA ERP em números">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {[
                  { value: '1.200+', label: 'Empresas ativas', sub: 'em todo o Brasil', Icon: Building2 },
                  { value: '40%', label: 'Menos inadimplência', sub: 'média no 1º mês', Icon: TrendingUp },
                  { value: 'R$85M+', label: 'Cobranças geradas', sub: 'nos últimos 12 meses', Icon: Banknote },
                  { value: '4.9★', label: 'Avaliação média', sub: '312 avaliações verificadas', Icon: Star },
                ].map(({ value, label, sub, Icon }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <Icon className="mb-1 h-5 w-5 text-red-500" aria-hidden="true" />
                    <dt className="text-3xl font-extrabold text-gray-900">{value}</dt>
                    <dd className="text-sm font-semibold text-gray-700">{label}</dd>
                    <dd className="text-xs text-gray-500">{sub}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* PAS — Problema / Agitação / Solução */}
          <section className="py-24" aria-labelledby="pain-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Você se identifica?</p>
                  <h2 id="pain-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                    Cobrar cliente é trabalhoso,{' '}
                    <span className="text-red-600">constrangedor e ineficiente</span>
                  </h2>
                  <p className="mt-4 text-lg text-gray-600">
                    A maioria das PMEs brasileiras ainda perde horas toda semana fazendo cobranças manualmente — e ainda assim a inadimplência continua crescendo.
                  </p>
                  <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                    {painPoints.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                        <Icon className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                        <span className="text-sm text-gray-700">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />A SOLUÇÃO
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900">
                    O WEBBA ERP cobra, lembra e registra — <span className="text-green-600">tudo automático</span>
                  </h3>
                  <p className="mt-3 text-gray-600">Configure uma vez. O sistema trabalha enquanto você dorme.</p>
                  <ul className="mt-6 space-y-3">
                    {['PIX e boleto gerados e enviados automaticamente','WhatsApp com QR Code no dia do vencimento','Pagamento confirmado e baixado sem intervenção','Dashboard mostrando quem pagou e quem deve','Clientes pagam pelo portal — sem você precisar ajudar'].map(item => (
                      <li key={item} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-8 flex w-fit items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors">
                    Resolver agora — 7 dias grátis <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* COMO FUNCIONA — 3 passos */}
          <section id="como-funciona" className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-24 text-white" aria-labelledby="steps-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-400">Simplicidade</p>
                <h2 id="steps-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pronto para cobrar em 5 minutos</h2>
                <p className="mt-4 text-white/60">Sem instalar nada. Sem precisar de TI. Sem treinamento longo.</p>
              </div>
              <div className="mt-16 grid gap-6 md:grid-cols-3">
                {[
                  { num: '01', title: 'Crie sua conta', desc: 'Sem cartão de crédito. Preencha nome da empresa, e-mail e senha. Em 30 segundos você está dentro da plataforma completa.', Icon: ShieldCheck, detail: 'Gratuito por 7 dias' },
                  { num: '02', title: 'Importe seus clientes', desc: 'Suba sua planilha CSV ou cadastre os clientes manualmente. O sistema valida CPF/CNPJ e organiza automaticamente.', Icon: Users, detail: 'Importação em 1 clique' },
                  { num: '03', title: 'Ative a cobrança automática', desc: 'Configure os vencimentos, escolha PIX + boleto + WhatsApp. O WEBBA ERP faz o resto no piloto automático.', Icon: Zap, detail: 'No ar em 5 minutos' },
                ].map(({ num, title, desc, Icon, detail }) => (
                  <div key={num} className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                    <div className="mb-1 text-6xl font-extrabold leading-none text-white/8">{num}</div>
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-400">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mb-3 text-lg font-bold">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/60">{desc}</p>
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                      <CheckCircle2 className="h-3 w-3 text-green-400" aria-hidden="true" />{detail}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-12 text-center">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-4 text-base font-bold text-white hover:bg-red-500 transition-all shadow-lg shadow-red-900/40">
                  Criar minha conta agora <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          {/* FUNCIONALIDADES — FAB (Feature → Advantage → Benefit) */}
          <section id="funcionalidades" className="py-24" aria-labelledby="features-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Funcionalidades</p>
                <h2 id="features-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Tudo que sua empresa precisa em um só sistema
                </h2>
                <p className="mt-4 text-lg text-gray-500">Sem múltiplos softwares. Sem dados espalhados. Sem retrabalho.</p>
              </div>
              <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map(({ icon: Icon, title, feature, advantage, benefit, color, border }) => (
                  <article key={title} className={`rounded-2xl border ${border} bg-white p-8 shadow-sm transition-shadow hover:shadow-md`}>
                    <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mb-4 text-lg font-bold text-gray-900">{title}</h3>
                    <dl className="space-y-2 text-sm">
                      <div><dt className="inline font-semibold text-gray-700">O que é: </dt><dd className="inline text-gray-500">{feature}</dd></div>
                      <div><dt className="inline font-semibold text-gray-700">Diferencial: </dt><dd className="inline text-gray-500">{advantage}</dd></div>
                      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                        <dt className="inline text-xs font-bold uppercase tracking-wide text-gray-500">Resultado: </dt>
                        <dd className="inline text-sm font-semibold text-gray-800">{benefit}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* DEPOIMENTOS — com métrica específica */}
          <section className="bg-gray-50 py-24" aria-labelledby="testimonials-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Resultados reais</p>
                <h2 id="testimonials-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Empresas que pararam de perder dinheiro
                </h2>
              </div>
              <div className="mt-16 grid gap-8 md:grid-cols-3">
                {testimonials.map(({ name, role, company, initials, bg, body, metric }) => (
                  <blockquote key={name} className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                    <div>
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1">
                        <TrendingUp className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                        <span className="text-xs font-bold text-green-700">{metric}</span>
                      </div>
                      <div className="mb-3 flex gap-0.5" aria-label="5 de 5 estrelas">
                        {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />)}
                      </div>
                      <p className="leading-relaxed text-gray-700">&ldquo;{body}&rdquo;</p>
                    </div>
                    <footer className="mt-6 flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg} text-sm font-bold text-white`} aria-hidden="true">{initials}</div>
                      <div>
                        <div className="font-semibold text-gray-900">{name}</div>
                        <div className="text-sm text-gray-500">{role} · {company}</div>
                      </div>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>

          {/* COMPARAÇÃO — WEBBA vs Planilha vs Outros ERPs */}
          <section className="py-24" aria-labelledby="comparison-heading">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Comparação</p>
                <h2 id="comparison-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Por que trocar a planilha pelo WEBBA ERP?
                </h2>
                <p className="mt-4 text-gray-500">Veja o que você ganha — e o que você para de perder.</p>
              </div>
              <div className="mt-12 overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="w-1/2 p-4 text-left font-semibold text-gray-700">Funcionalidade</th>
                      <th className="min-w-[110px] bg-red-50 p-4 text-center font-bold text-red-600">WEBBA ERP</th>
                      <th className="min-w-[110px] p-4 text-center font-semibold text-gray-500">Planilha</th>
                      <th className="min-w-[110px] p-4 text-center font-semibold text-gray-500">Outros ERPs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map(({ feature, webba, planilha, outro }, i) => (
                      <tr key={feature} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="p-4 text-gray-700">{feature}</td>
                        <td className="bg-red-50/40 p-4">{typeof webba === 'string' ? <span className="block text-center font-bold text-red-700">{webba}</span> : <CIcon v={webba} />}</td>
                        <td className="p-4">{typeof planilha === 'string' ? <span className="block text-center font-semibold text-gray-600">{planilha}</span> : <CIcon v={planilha} />}</td>
                        <td className="p-4">{typeof outro === 'string' ? <span className="block text-center font-semibold text-gray-600">{outro}</span> : <CIcon v={outro} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-center text-xs text-gray-500">* Outros ERPs genéricos com planos similares custam entre R$250–R$600/mês sem cobrança automática por WhatsApp.</p>
            </div>
          </section>

          {/* E-E-A-T — Sinais de confiança e segurança */}
          <section className="bg-slate-950 py-16 text-white" aria-labelledby="trust-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 id="trust-heading" className="mb-10 text-center text-lg font-bold text-white/60">Segurança e conformidade que sua empresa merece</h2>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {[
                  { Icon: ShieldCheck, label: 'LGPD Compliance', sub: 'Lei 13.709/2018' },
                  { Icon: Lock, label: 'SSL/TLS 256-bit', sub: 'Criptografia ponta-a-ponta' },
                  { Icon: Users, label: 'RBAC/ABAC', sub: 'Controle de acesso por perfil' },
                  { Icon: RefreshCw, label: 'Backup automático', sub: 'Dados nunca perdidos' },
                  { Icon: Clock, label: '99,9% Uptime', sub: 'SLA garantido' },
                  { Icon: FileText, label: 'Auditoria completa', sub: 'Log de todas as ações' },
                ].map(({ Icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                      <Icon className="h-6 w-6 text-white/70" aria-hidden="true" />
                    </div>
                    <div className="text-sm font-semibold text-white/80">{label}</div>
                    <div className="text-xs text-white/45">{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* PLANOS — com ROI e risk reversal */}
          <section id="planos" className="py-24" aria-labelledby="pricing-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Planos e preços</p>
                <h2 id="pricing-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Investimento que se paga no primeiro mês
                </h2>
                <p className="mt-4 text-gray-500">Se o WEBBA ERP recuperar <strong>uma cobrança perdida por inadimplência</strong>, ele já se pagou. Sem fidelidade.</p>
              </div>
              <div className="mt-16 grid gap-8 md:grid-cols-3">
                {plans.map(({ name, price, desc, highlight, roi, features }) => (
                  <div key={name} className={`relative flex flex-col rounded-2xl p-8 ${highlight ? 'border-2 border-red-600 bg-red-600 text-white shadow-2xl shadow-red-900/30' : 'border border-gray-100 bg-white shadow-sm'}`}>
                    {highlight && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="rounded-full bg-yellow-400 px-4 py-1 text-xs font-extrabold text-yellow-900">★ MAIS POPULAR ★</span>
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold">{name}</h3>
                      <p className={`mt-1 text-sm ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{desc}</p>
                      <div className="mt-4 flex items-end gap-1">
                        <span className="text-4xl font-extrabold">{price}</span>
                        <span className={`mb-1 text-sm ${highlight ? 'text-white/80' : 'text-gray-500'}`}>/mês</span>
                      </div>
                      <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${highlight ? 'bg-white/20 text-white' : 'border border-green-200 bg-green-50 text-green-700'}`}>
                        <Zap className="h-3 w-3" aria-hidden="true" />{roi}
                      </div>
                    </div>
                    <ul className="mb-8 flex-1 space-y-3">
                      {features.map(f => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${highlight ? 'text-white/80' : 'text-green-600'}`} aria-hidden="true" />
                          <span className={highlight ? 'text-white/90' : 'text-gray-700'}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/register" className={`block rounded-xl py-3.5 text-center text-sm font-bold transition-all ${highlight ? 'bg-white text-red-600 hover:bg-red-50' : 'bg-gray-900 text-white hover:bg-gray-700'}`}>
                      Começar 7 dias grátis
                    </Link>
                    <p className={`mt-2 text-center text-xs ${highlight ? 'text-white/50' : 'text-gray-400'}`}>Sem cartão · Sem contrato</p>
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-12 max-w-2xl rounded-2xl border-2 border-dashed border-green-300 bg-green-50 p-6 text-center">
                <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-green-600" aria-hidden="true" />
                <h3 className="text-lg font-bold text-green-800">Garantia de 7 dias grátis</h3>
                <p className="mt-2 text-sm text-green-700">Teste a plataforma completa sem pagar nada e sem cartão de crédito. Se não reduzir sua inadimplência, cancele em 1 clique — sem perguntas.</p>
              </div>
            </div>
          </section>

          {/* FAQ — "People Also Ask" */}
          <section id="faq" className="bg-gray-50 py-24" aria-labelledby="faq-heading">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">FAQ</p>
                <h2 id="faq-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Dúvidas sobre sistema de cobrança automática
                </h2>
                <p className="mt-4 text-gray-500">Tudo que você precisa saber antes de começar.</p>
              </div>
              <dl className="mt-12 space-y-3">
                {faqs.map(({ q, a }) => (
                  <details key={q} className="group rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm open:shadow-md">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900 marker:hidden">
                      <dt>{q}</dt>
                      <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <dd className="mt-4 text-sm leading-relaxed text-gray-600">{a}</dd>
                  </details>
                ))}
              </dl>
              <div className="mt-10 text-center">
                <p className="text-gray-500">Ainda tem dúvidas?</p>
                <a href="mailto:suporte@webba.site" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700">
                  <PhoneCall className="h-4 w-4" aria-hidden="true" />Fale com nosso suporte
                </a>
              </div>
            </div>
          </section>

          {/* CTA FINAL — PAS final + urgência + risk reversal */}
          <section className="bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 py-28 text-white" aria-labelledby="cta-heading">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
                +1.200 empresas já automatizaram — e você?
              </div>
              <h2 id="cta-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Cada dia sem o WEBBA ERP é{' '}
                <span className="bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent">
                  mais dinheiro perdido
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
                Enquanto você lê isso, uma cobrança vence e seu cliente não recebe lembrete.
                Comece grátis agora e veja a diferença nos <strong className="text-white/90">primeiros 7 dias</strong>.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/register" className="flex items-center gap-2 rounded-xl bg-red-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-red-900/50 hover:bg-red-500 transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-950">
                  Começar meus 7 dias grátis agora <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/portal" className="rounded-xl border border-white/15 px-10 py-4 text-base font-semibold text-white/80 hover:bg-white/5 hover:text-white transition-all">
                  Sou cliente — pagar minha cobrança
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/50">
                {['Sem cartão de crédito','7 dias grátis completos','Cancele quando quiser','Suporte em português'].map(t => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />{t}</span>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* FOOTER — semântico com keywords nos links */}
        <footer className="border-t border-gray-100 bg-white py-16" role="contentinfo">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 md:grid-cols-4">
              <div className="md:col-span-2">
                <picture>
                  <source srcSet="/logo.webp" type="image/webp" />
                  <Image src="/logo.png" alt="WEBBA ERP" width={120} height={40} />
                </picture>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
                  Sistema de cobrança automática via PIX, boleto e WhatsApp. ERP completo para pequenas e médias empresas brasileiras.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-500">
                  {[{ Icon: ShieldCheck, c: 'text-green-500', t: 'LGPD' }, { Icon: Lock, c: 'text-blue-500', t: 'SSL 256-bit' }, { Icon: CheckCircle2, c: 'text-purple-500', t: '99,9% Uptime' }, { Icon: Star, c: 'text-yellow-500', t: '4.9/5 · 312 avaliações' }].map(({ Icon, c, t }) => (
                    <span key={t} className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1">
                      <Icon className={`h-3 w-3 ${c}`} aria-hidden="true" />{t}
                    </span>
                  ))}
                </div>
              </div>
              <nav aria-label="Links do produto">
                <h3 className="mb-4 text-sm font-bold text-gray-900">Produto</h3>
                <ul className="space-y-2.5 text-sm text-gray-500">
                  {[['#funcionalidades','Sistema de cobrança automática'],['#funcionalidades','ERP para pequenas empresas'],['#funcionalidades','Cobrança por WhatsApp'],['#funcionalidades','Portal do cliente online'],['#planos','Planos e preços'],['#faq','Perguntas frequentes']].map(([href, label]) => (
                    <li key={label}><a href={href} className="hover:text-red-600 transition-colors">{label}</a></li>
                  ))}
                </ul>
              </nav>
              <nav aria-label="Links de acesso">
                <h3 className="mb-4 text-sm font-bold text-gray-900">Acesso</h3>
                <ul className="space-y-2.5 text-sm text-gray-500">
                  <li><Link href="/register" className="font-semibold text-red-600 hover:text-red-700">Criar conta grátis →</Link></li>
                  <li><Link href="/login" className="hover:text-red-600 transition-colors">Entrar na conta</Link></li>
                  <li><Link href="/portal" className="hover:text-red-600 transition-colors">Portal do cliente</Link></li>
                </ul>
                <h3 className="mb-4 mt-8 text-sm font-bold text-gray-900">Contato</h3>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><a href="mailto:suporte@webba.site" className="hover:text-red-600 transition-colors">suporte@webba.site</a></li>
                </ul>
              </nav>
            </div>
            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 text-xs text-gray-400 sm:flex-row">
              <p>© {new Date().getFullYear()} WEBBA ERP. Todos os direitos reservados. Desenvolvido no Brasil 🇧🇷</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-gray-600 transition-colors">Privacidade (LGPD)</a>
                <a href="#" className="hover:text-gray-600 transition-colors">Termos de uso</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
