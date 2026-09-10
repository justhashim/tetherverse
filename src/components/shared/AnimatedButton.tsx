'use client';

import { motion } from "framer-motion";

interface AnimatedButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    variant: "primary" | "secondary";
    className?: string;
}

export default function AnimatedButton({ children, onClick, variant, className = "" }: AnimatedButtonProps) {
    const isPrimary = variant === "primary";

    return (
        <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`group relative w-full sm:w-auto min-h-[52px] md:min-h-[56px] px-8 py-4 font-mono font-black text-xs md:text-sm tracking-[0.2em] uppercase rounded-2xl transition-all duration-300 overflow-hidden flex items-center justify-center gap-2 cursor-pointer select-none ${isPrimary
                ? "bg-linear-to-r from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:shadow-[0_0_45px_rgba(139,92,246,0.6)] border border-cyan-300/40 active:border-cyan-300"
                : "bg-slate-950/70 hover:bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:border-violet-500/50 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                } ${className}`}
        >
            {/* Shimmer Light Flare Layer */}
            <span className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

            {/* Glowing Accent Pips */}
            {isPrimary && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping pointer-events-none" />
            )}

            <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        </motion.button>
    );
}