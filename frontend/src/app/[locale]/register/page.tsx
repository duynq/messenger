'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Mail, Lock, User } from 'lucide-react';
import { registerAction } from '@/actions/auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useActionToast } from '@/hooks/useActionToast';

const initialState = {};

export default function RegisterPage() {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  useActionToast(state);

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <div className="absolute inset-0 bg-glass-gradient opacity-30 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <GlassCard className="w-full max-w-md p-10 backdrop-blur-2xl bg-surface-dark border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold mb-2">{t('auth.createAccount')}</h2>
            <p className="text-white/60 mb-8">{t('auth.signUpSubtitle')}</p>

            <form action={formAction} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                      <User size={18} />
                    </div>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      placeholder={t('auth.firstName')}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-white/30 text-white"
                    />
                  </div>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    placeholder={t('auth.lastName')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-white/30 text-white"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder={t('auth.email')}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-white/30 text-white"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder={t('auth.passwordMin')}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-white/30 text-white"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    required
                    placeholder={t('auth.confirmPassword')}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-white/30 text-white"
                  />
                </div>
              </div>

              <AnimatedButton type="submit" isLoading={isPending} className="w-full">
                {t('auth.createAccount')}
              </AnimatedButton>
            </form>

            <div className="mt-8 text-center">
              <p className="text-white/60 text-sm">
                {t('auth.hasAccount')}{' '}
                <Link
                  href="/login"
                  className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  {t('auth.signIn')}
                </Link>
              </p>
            </div>
          </motion.div>
        </GlassCard>
      </div>

      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center relative z-10 p-12">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-md text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl mx-auto mb-8 shadow-glass flex items-center justify-center -rotate-12 hover:rotate-0 transition-transform duration-500">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            {t('auth.joinApp')}
          </h1>
          <p className="text-lg text-white/60">{t('auth.registerTagline')}</p>
        </motion.div>
      </div>
    </div>
  );
}
