import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, BarChart2, CheckCircle2, ChevronDown, CreditCard,
  FileText, Globe, LayoutDashboard, MessageCircle, Package,
  ShieldCheck, Sparkles, Users, Zap, Star, TrendingUp, Clock,
  Smartphone, Lock, RefreshCw,
} from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crm.webba.site';

export const metadata: Metadata = {
  title: 'WEBBA ERP | Sistema de Cobrança e Gestão Empresarial para Empresas Brasileiras',
  description:
    'Automatize cobranças com PIX e boleto, gerencie clientes, estoque e financeiro. WEBBA ERP: o ERP SaaS mais completo para pequenas e médias empresas do Brasil. Teste grátis.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'WEBBA ERP | Cobrança Automatizada + ERP Completo',
    description:
      'PIX, boleto, WhatsApp, CRM, estoque e financeiro em uma plataforma. Mais de 1.000 empresas confiam no WEBBA ERP.',
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
      operatingSystem: 'Web',
      description:
        'Sistema de gestão empresarial completo com cobrança automatizada via PIX e boleto, CRM, controle de estoque, financeiro e lembretes automáticos via WhatsApp.',
      url: SITE_URL,
      offers: [
        {
          '@type': 'Offer',
          name: 'Plano Básico',
          price: '97',
          priceCurrency: 'BRL',
          priceSpecification: { billingDuration: 'P1M' },
        },
        {
          '@type': 'Offer',
          name: 'Plano Profissional',
          price: '197',
          priceCurrency: 'BRL',
          priceSpecification: { billingDuration: 'P1M' },
        },
        {
          '@type': 'Offer',
          name: 'Plano Enterprise',
          price: '397',
          priceCurrency: 'BRL',
          priceSpecification: { billingDuration: 'P1M' },
        },
      ],
      featureList: [
        'Cobrança automatizada via PIX e boleto',
        'Lembretes de cobrança pelo WhatsApp',
        'CRM de clientes',
        'Controle de estoque',
        'Gestão financeira',
        'Portal do cliente',
        'Relatórios e dashboards',
        'Integração com Asaas',
        'Open Finance',
        'Notas fiscais',
      ],
      screenshot: `${SITE_URL}/og-image.png`,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '312',
        bestRating: '5',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'WEBBA ERP',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
        width: 160,
        height: 54,
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: 'Portuguese',
      },
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'WEBBA ERP',
      inLanguage: 'pt-BR',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/portal?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'O WEBBA ERP emite boleto e PIX automaticamente?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O WEBBA ERP gera cobranças via PIX (QR Code e Copia e Cola) e boleto bancário de forma automática, com envio de lembretes pelo WhatsApp nos dias programados.',
          },
        },
        {
          '@type': 'Question',
          name: 'Posso usar o WEBBA ERP no celular?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O WEBBA ERP é 100% responsivo e funciona em qualquer dispositivo — computador, tablet ou smartphone — sem precisar instalar nenhum aplicativo.',
          },
        },
        {
          '@type': 'Question',
          name: 'O sistema funciona para qual tipo de empresa?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O WEBBA ERP foi desenvolvido para pequenas e médias empresas brasileiras de qualquer segmento: comércio, serviços, distribuidoras, escritórios de cobrança e prestadores de serviço.',
          },
        },
        {
          '@type': 'Question',
          name: 'Tem integração com Asaas e gateway de pagamento?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O WEBBA ERP integra nativamente com a Asaas para geração de boletos, PIX e link de pagamento com cartão de crédito. Seus clientes podem pagar diretamente pelo portal.',
          },
        },
        {
          '@type': 'Question',
          name: 'Existe contrato de fidelidade?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Não. Os planos do WEBBA ERP são mensais e podem ser cancelados a qualquer momento, sem multa ou taxa de cancelamento.',
          },
        },
        {
          '@type': 'Question',
          name: 'Meus dados ficam seguros?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O WEBBA ERP utiliza isolamento total por tenant, criptografia JWT, RBAC/ABAC e auditoria de todas as operações. A plataforma segue as diretrizes da LGPD.',
          },
        },
      ],
    },
  ],
};

const modules = [
  {
    icon: CreditCard,
    title: 'Cobrança Automatizada',
    desc: 'Gere boletos e PIX automaticamente. Envie lembretes pelo WhatsApp nos dias programados e reduza sua inadimplência.',
    color: 'bg-red-50 text-red-600',
  },
  {
    icon: Users,
    title: 'CRM de Clientes',
    desc: 'Gerencie todo o ciclo de vida dos seus clientes: leads, oportunidades, histórico de compras e interações.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: BarChart2,
    title: 'Gestão Financeira',
    desc: 'Fluxo de caixa, DRE, contas a pagar e a receber, conciliação bancária e Open Finance integrado.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: Package,
    title: 'Controle de Estoque',
    desc: 'Gerencie produtos, entradas, saídas, alertas de estoque mínimo e inventário em tempo real.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: FileText,
    title: 'Documentos e NF',
    desc: 'Emissão de notas fiscais, contratos, propostas e gestão completa de documentos da empresa.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: Globe,
    title: 'Portal do Cliente',
    desc: 'Seus clientes acessam cobranças, baixam boletos e pagam online por CPF — sem precisar de login.',
    color: 'bg-teal-50 text-teal-600',
  },
];

const steps = [
  {
    num: '01',
    title: 'Cadastre sua empresa',
    desc: 'Crie sua conta em menos de 2 minutos. Sem cartão de crédito. Comece a usar imediatamente.',
    icon: Building,
  },
  {
    num: '02',
    title: 'Importe seus clientes',
    desc: 'Importe sua base de clientes via CSV ou cadastre manualmente. O sistema já organiza tudo.',
    icon: Users,
  },
  {
    num: '03',
    title: 'Automatize cobranças',
    desc: 'Configure os vencimentos e o WEBBA ERP cobra, lembra e registra pagamentos automaticamente.',
    icon: Zap,
  },
];

const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'Diretor Financeiro, Distribuidora Norte',
    body: 'Reduzi minha inadimplência em 40% no primeiro mês. Os lembretes automáticos pelo WhatsApp fazem toda a diferença.',
    rating: 5,
  },
  {
    name: 'Ana Paula Costa',
    role: 'Proprietária, Clínica Estética Bela',
    body: 'Finalmente um sistema que é completo E simples. Antes usava 4 softwares diferentes. Hoje uso só o WEBBA.',
    rating: 5,
  },
  {
    name: 'Roberto Silva',
    role: 'CEO, Construtora RS',
    body: 'O portal do cliente é incrível. Meus clientes conseguem pagar o boleto sem ligar para mim. Economizei horas por semana.',
    rating: 5,
  },
];

const plans = [
  {
    name: 'Básico',
    price: 'R$ 97',
    period: '/mês',
    desc: 'Para quem está começando',
    highlight: false,
    features: [
      'Até 500 clientes',
      'Cobrança via PIX e boleto',
      'Lembretes WhatsApp',
      'Relatórios básicos',
      'Portal do cliente',
      'Suporte por e-mail',
    ],
  },
  {
    name: 'Profissional',
    price: 'R$ 197',
    period: '/mês',
    desc: 'O mais escolhido',
    highlight: true,
    features: [
      'Clientes ilimitados',
      'Tudo do plano Básico',
      'CRM completo',
      'Gestão financeira',
      'Controle de estoque',
      'Integração Asaas',
      'Open Finance',
      'Suporte prioritário',
    ],
  },
  {
    name: 'Enterprise',
    price: 'R$ 397',
    period: '/mês',
    desc: 'Para múltiplas empresas',
    highlight: false,
    features: [
      'Multi-empresa (tenants)',
      'Tudo do plano Profissional',
      'Gestão de usuários RBAC',
      'Auditoria completa',
      'Notas fiscais',
      'API & webhooks',
      'Onboarding dedicado',
      'SLA garantido',
    ],
  },
];

const faqs = [
  {
    q: 'O WEBBA ERP emite boleto e PIX automaticamente?',
    a: 'Sim. O sistema gera cobranças via PIX (QR Code e Copia e Cola) e boleto bancário automaticamente, com lembretes pelo WhatsApp nos dias programados.',
  },
  {
    q: 'Posso usar no celular?',
    a: 'Sim. O WEBBA ERP é 100% responsivo e funciona em qualquer dispositivo — computador, tablet ou smartphone — sem precisar instalar aplicativo.',
  },
  {
    q: 'Para que tipo de empresa serve?',
    a: 'Para pequenas e médias empresas de qualquer segmento: comércio, serviços, distribuidoras, escritórios de cobrança e prestadores de serviço.',
  },
  {
    q: 'Tem integração com gateway de pagamento?',
    a: 'Sim. Integração nativa com Asaas para boletos, PIX e pagamento com cartão. Seus clientes pagam pelo portal do cliente.',
  },
  {
    q: 'Existe contrato de fidelidade?',
    a: 'Não. Planos mensais, sem fidelidade. Cancele quando quiser, sem multa.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Sim. Isolamento total por empresa, criptografia, RBAC e auditoria de todas as operações. Seguimos a LGPD.',
  },
];

function Building(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h1v1H9zM14 9h1v1h-1zM9 14h1v1H9zM14 14h1v1h-1z" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white text-gray-900">

        {/* ── NAV ── */}
        <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
          <nav
            className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
            aria-label="Navegação principal"
          >
            <Link href="/" aria-label="WEBBA ERP — Página inicial">
              <Image src="/logo.png" alt="WEBBA ERP" width={130} height={44} priority />
            </Link>
            <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
              <a href="#funcionalidades" className="hover:text-gray-900 transition-colors">Funcionalidades</a>
              <a href="#como-funciona" className="hover:text-gray-900 transition-colors">Como funciona</a>
              <a href="#planos" className="hover:text-gray-900 transition-colors">Planos</a>
              <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden text-sm font-semibold text-gray-700 hover:text-red-600 transition-colors sm:block"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Começar grátis
              </Link>
            </div>
          </nav>
        </header>

        <main>
          {/* ── HERO ── */}
          <section
            className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 pb-24 pt-20 text-white"
            aria-labelledby="hero-heading"
          >
            {/* grid overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />
            {/* glow orbs */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-red-600/20 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full bg-blue-800/20 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                  Mais de 1.000 empresas já confiam no WEBBA ERP
                </div>

                <h1
                  id="hero-heading"
                  className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
                >
                  Gestão empresarial{' '}
                  <span className="bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent">
                    simples e inteligente
                  </span>
                  {' '}para o Brasil
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
                  Automatize cobranças com <strong className="text-white/90">PIX e boleto</strong>, envie lembretes pelo <strong className="text-white/90">WhatsApp</strong> e gerencie clientes, estoque e financeiro. Tudo em uma única plataforma.
                </p>

                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Link
                    href="/register"
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-red-900/40 hover:bg-red-500 transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    Começar grátis agora
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white/80 backdrop-blur-sm hover:bg-white/10 hover:text-white transition-all"
                  >
                    Já tenho conta →
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/40">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />Sem cartão de crédito</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />Sem contrato</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />Cancele quando quiser</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── STATS BAR ── */}
          <section className="border-b border-gray-100 bg-gray-50 py-10" aria-label="Números do WEBBA ERP">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
                {[
                  { value: '1.000+', label: 'Empresas ativas', icon: TrendingUp },
                  { value: '40+', label: 'Módulos integrados', icon: LayoutDashboard },
                  { value: 'R$ 50M+', label: 'Cobranças processadas', icon: CreditCard },
                  { value: '99,9%', label: 'Uptime garantido', icon: Clock },
                ].map(({ value, label, icon: Icon }) => (
                  <div key={label} className="flex flex-col items-center gap-2 text-center">
                    <Icon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    <dt className="text-2xl font-extrabold text-gray-900">{value}</dt>
                    <dd className="text-sm text-gray-500">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* ── MÓDULOS ── */}
          <section id="funcionalidades" className="py-24" aria-labelledby="features-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Funcionalidades</p>
                <h2 id="features-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Tudo que sua empresa precisa em um só lugar
                </h2>
                <p className="mt-4 text-lg text-gray-500">
                  Do controle de cobranças à gestão completa da empresa. Sem precisar de múltiplos sistemas.
                </p>
              </div>

              <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map(({ icon: Icon, title, desc, color }) => (
                  <article
                    key={title}
                    className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mb-3 text-lg font-bold text-gray-900">{title}</h3>
                    <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── COMO FUNCIONA ── */}
          <section id="como-funciona" className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-24 text-white" aria-labelledby="steps-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-400">Como funciona</p>
                <h2 id="steps-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Comece a usar em menos de 5 minutos
                </h2>
              </div>

              <div className="mt-16 grid gap-8 md:grid-cols-3">
                {[
                  {
                    num: '01',
                    title: 'Cadastre sua empresa',
                    desc: 'Crie sua conta em menos de 2 minutos. Sem cartão de crédito. Comece a usar imediatamente.',
                    icon: ShieldCheck,
                  },
                  {
                    num: '02',
                    title: 'Importe seus clientes',
                    desc: 'Importe via CSV ou cadastre manualmente. O sistema organiza e segmenta automaticamente.',
                    icon: Users,
                  },
                  {
                    num: '03',
                    title: 'Automatize cobranças',
                    desc: 'Configure os vencimentos e o WEBBA ERP cobra, lembra e registra pagamentos no piloto automático.',
                    icon: Zap,
                  },
                ].map(({ num, title, desc, icon: Icon }) => (
                  <div key={num} className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                    <span className="mb-4 block text-5xl font-extrabold text-white/10">{num}</span>
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-400">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mb-3 text-lg font-bold">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/60">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── DIFERENCIAIS ── */}
          <section className="py-24" aria-labelledby="diff-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Por que o WEBBA ERP?</p>
                  <h2 id="diff-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                    Feito para a realidade das empresas brasileiras
                  </h2>
                  <p className="mt-4 text-lg text-gray-500">
                    Desenvolvido por brasileiros para brasileiros. PIX nativo, boleto integrado e suporte em português.
                  </p>

                  <ul className="mt-8 space-y-4">
                    {[
                      { icon: MessageCircle, text: 'Lembretes automáticos pelo WhatsApp nos dias programados', color: 'text-green-600 bg-green-50' },
                      { icon: CreditCard, text: 'PIX, boleto e cartão pelo portal — seus clientes pagam sem ligar', color: 'text-blue-600 bg-blue-50' },
                      { icon: Smartphone, text: '100% web e responsivo — funciona em qualquer dispositivo', color: 'text-purple-600 bg-purple-50' },
                      { icon: Lock, text: 'Isolamento total por empresa com auditoria em cada operação', color: 'text-red-600 bg-red-50' },
                      { icon: RefreshCw, text: 'Cobrança recorrente mensal criada automaticamente', color: 'text-orange-600 bg-orange-50' },
                    ].map(({ icon: Icon, text, color }) => (
                      <li key={text} className="flex items-start gap-4">
                        <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-gray-700">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Redução de inadimplência', value: '40%', icon: TrendingUp, color: 'bg-red-600' },
                    { label: 'Horas economizadas/mês', value: '20h', icon: Clock, color: 'bg-blue-600' },
                    { label: 'Taxa de entrega WhatsApp', value: '97%', icon: MessageCircle, color: 'bg-green-600' },
                    { label: 'Clientes satisfeitos', value: '4.9★', icon: Star, color: 'bg-purple-600' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`rounded-2xl ${color} p-6 text-white`}>
                      <Icon className="mb-3 h-6 w-6 opacity-80" aria-hidden="true" />
                      <div className="text-3xl font-extrabold">{value}</div>
                      <div className="mt-1 text-sm opacity-70">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── DEPOIMENTOS ── */}
          <section className="bg-gray-50 py-24" aria-labelledby="testimonials-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Depoimentos</p>
                <h2 id="testimonials-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  O que nossos clientes dizem
                </h2>
              </div>

              <div className="mt-16 grid gap-8 md:grid-cols-3">
                {testimonials.map(({ name, role, body, rating }) => (
                  <blockquote
                    key={name}
                    className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
                  >
                    <div>
                      <div className="mb-4 flex gap-1" aria-label={`Avaliação: ${rating} de 5 estrelas`}>
                        {Array.from({ length: rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                        ))}
                      </div>
                      <p className="text-gray-700 leading-relaxed">&ldquo;{body}&rdquo;</p>
                    </div>
                    <footer className="mt-6">
                      <div className="font-semibold text-gray-900">{name}</div>
                      <div className="text-sm text-gray-500">{role}</div>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>

          {/* ── PLANOS ── */}
          <section id="planos" className="py-24" aria-labelledby="pricing-heading">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Planos</p>
                <h2 id="pricing-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Escolha o plano certo para sua empresa
                </h2>
                <p className="mt-4 text-gray-500">Sem contrato. Cancele quando quiser.</p>
              </div>

              <div className="mt-16 grid gap-8 md:grid-cols-3">
                {plans.map(({ name, price, period, desc, highlight, features }) => (
                  <div
                    key={name}
                    className={`relative flex flex-col rounded-2xl p-8 ${
                      highlight
                        ? 'border-2 border-red-600 bg-red-600 text-white shadow-2xl shadow-red-900/30'
                        : 'border border-gray-100 bg-white shadow-sm'
                    }`}
                  >
                    {highlight && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-yellow-400 px-4 py-1 text-xs font-bold text-yellow-900">
                          MAIS POPULAR
                        </span>
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold">{name}</h3>
                      <p className={`mt-1 text-sm ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{desc}</p>
                      <div className="mt-4 flex items-end gap-1">
                        <span className="text-4xl font-extrabold">{price}</span>
                        <span className={`mb-1 text-sm ${highlight ? 'text-white/70' : 'text-gray-400'}`}>{period}</span>
                      </div>
                    </div>

                    <ul className="mb-8 flex-1 space-y-3">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${highlight ? 'text-white/80' : 'text-green-600'}`} aria-hidden="true" />
                          <span className={highlight ? 'text-white/90' : 'text-gray-700'}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/register"
                      className={`block rounded-xl py-3 text-center text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        highlight
                          ? 'bg-white text-red-600 hover:bg-red-50 focus:ring-white'
                          : 'bg-gray-900 text-white hover:bg-gray-700 focus:ring-gray-900'
                      }`}
                    >
                      Começar com {name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section id="faq" className="bg-gray-50 py-24" aria-labelledby="faq-heading">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-600">Dúvidas frequentes</p>
                <h2 id="faq-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Perguntas frequentes
                </h2>
              </div>

              <dl className="mt-12 space-y-4">
                {faqs.map(({ q, a }) => (
                  <details
                    key={q}
                    className="group rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm open:shadow-md"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900 marker:hidden">
                      <dt>{q}</dt>
                      <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <dd className="mt-4 text-sm leading-relaxed text-gray-600">{a}</dd>
                  </details>
                ))}
              </dl>
            </div>
          </section>

          {/* ── CTA FINAL ── */}
          <section className="bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 py-24 text-white" aria-labelledby="cta-heading">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
              <h2 id="cta-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Pronto para transformar{' '}
                <span className="bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent">
                  a gestão da sua empresa?
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
                Junte-se a mais de 1.000 empresas que já reduziram a inadimplência e automatizaram cobranças com o WEBBA ERP.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-red-900/50 hover:bg-red-500 transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Começar grátis agora
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/portal"
                  className="rounded-xl border border-white/15 px-10 py-4 text-base font-semibold text-white/80 hover:bg-white/5 hover:text-white transition-all"
                >
                  Sou cliente — pagar cobrança
                </Link>
              </div>
              <p className="mt-6 text-xs text-white/30">
                Sem cartão de crédito · Sem contrato · Cancele quando quiser
              </p>
            </div>
          </section>
        </main>

        {/* ── FOOTER ── */}
        <footer className="border-t border-gray-100 bg-white py-12" role="contentinfo">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-4">
              <div className="md:col-span-2">
                <Image src="/logo.png" alt="WEBBA ERP" width={120} height={40} />
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
                  Sistema de gestão empresarial completo para pequenas e médias empresas brasileiras.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-500" aria-hidden="true" />LGPD</span>
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-blue-500" aria-hidden="true" />SSL/TLS</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-purple-500" aria-hidden="true" />99,9% uptime</span>
                </div>
              </div>

              <nav aria-label="Links do produto">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Produto</h3>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><a href="#funcionalidades" className="hover:text-gray-900 transition-colors">Funcionalidades</a></li>
                  <li><a href="#planos" className="hover:text-gray-900 transition-colors">Planos e preços</a></li>
                  <li><a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a></li>
                  <li><Link href="/portal" className="hover:text-gray-900 transition-colors">Portal do cliente</Link></li>
                </ul>
              </nav>

              <nav aria-label="Links da conta">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Conta</h3>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><Link href="/login" className="hover:text-gray-900 transition-colors">Entrar</Link></li>
                  <li><Link href="/register" className="hover:text-gray-900 transition-colors">Criar conta grátis</Link></li>
                </ul>
              </nav>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 text-xs text-gray-400 sm:flex-row">
              <p>© {new Date().getFullYear()} WEBBA ERP. Todos os direitos reservados.</p>
              <p>Desenvolvido com ❤️ no Brasil 🇧🇷</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
