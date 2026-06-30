import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Toaster } from 'sonner';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { PresenceProvider } from '@/components/providers/PresenceProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { getSessionUser } from '@/lib/session';
import { cookies } from 'next/headers';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Messenger',
  description: 'A premium full-stack web application.',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const user = await getSessionUser();
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground selection:bg-brand-500/30 selection:text-brand-200`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider user={user}>
            <PresenceProvider token={token}>
              <NotificationProvider token={token}>
                {children}
                <Toaster
                  theme="dark"
                  toastOptions={{ className: 'glass-panel !border-white/10 !text-white' }}
                />
              </NotificationProvider>
            </PresenceProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
