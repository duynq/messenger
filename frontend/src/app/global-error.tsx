'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-10 max-w-md text-center"
          >
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Error</h2>
            <p className="text-white/60 mb-6">
              {error.message || 'A critical error occurred. Please try again.'}
            </p>
            <AnimatedButton onClick={reset}>Try Again</AnimatedButton>
          </motion.div>
        </div>
      </body>
    </html>
  );
}
