'use client';

import { motion, HTMLMotionProps } from "framer-motion";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export function AnimatedButton({ children, className, isLoading, variant = "primary", disabled, ...props }: AnimatedButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center font-medium transition-colors rounded-xl px-6 py-3 overflow-hidden";
  
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20",
    secondary: "bg-surface-default hover:bg-surface-light text-white border border-white/10",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
    ghost: "bg-transparent hover:bg-surface-default text-gray-300 hover:text-white"
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={twMerge(
        baseStyles,
        variants[variant],
        (disabled || isLoading) && "opacity-60 cursor-not-allowed",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {children}
    </motion.button>
  );
}
