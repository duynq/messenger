'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  const tCommon = useTranslations('common');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-10 max-w-md text-center"
      >
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t('title')}</h2>
        <p className="text-white/60 mb-6">{error.message || t('unexpected')}</p>
        <AnimatedButton onClick={reset}>{tCommon('tryAgain')}</AnimatedButton>
      </motion.div>
    </div>
  );
}
