import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Providers } from './providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crm.webba.site';
const SITE_NAME = 'WEBBA ERP';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'WEBBA ERP | Sistema de Gestão Empresarial e Cobrança',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'WEBBA ERP é o sistema de gestão empresarial completo para pequenas e médias empresas brasileiras. Controle cobranças, PIX, boletos, CRM, estoque, financeiro e muito mais em uma única plataforma.',
  keywords: [
    'sistema de cobrança',
    'ERP para pequenas empresas',
    'software de gestão empresarial',
    'controle financeiro online',
    'sistema de boleto e PIX',
    'CRM brasileiro',
    'gestão de clientes',
    'controle de estoque',
    'ERP SaaS Brasil',
    'software de cobrança automatizada',
    'lembretes de cobrança WhatsApp',
    'sistema financeiro para empresas',
  ],
  authors: [{ name: 'WEBBA ERP', url: SITE_URL }],
  creator: 'WEBBA ERP',
  publisher: 'WEBBA ERP',
  category: 'Software empresarial',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: { 'pt-BR': SITE_URL },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'WEBBA ERP | Sistema de Gestão Empresarial e Cobrança',
    description:
      'Controle cobranças, PIX, boletos, CRM, estoque e financeiro em uma única plataforma. Simples, seguro e feito para empresas brasileiras.',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'WEBBA ERP — Sistema de Gestão Empresarial',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WEBBA ERP | Gestão Empresarial Completa',
    description:
      'Cobranças, PIX, boletos, CRM e financeiro em um só lugar. Feito para empresas brasileiras.',
    images: [`${SITE_URL}/og-image.png`],
    creator: '@webbaerp',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon-32x32.png',
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '',
  },
};

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
