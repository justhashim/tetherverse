'use client';

import { motion } from "framer-motion";

interface AnimatedButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    className?: string;
    type?: "button" | "submit" | "reset";
}

export default function AnimatedButton({
    children,
    onClick,
    variant = "primary",
    className = "",
    type = "button"
}: AnimatedButtonProps) {
    const getVariantClasses = () => {
        switch (variant) {
            case "primary":
                return "bg-white text-zinc-950 font-bold hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200 shadow-sm";
            case "secondary":
                return "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 shadow-sm";
            case "danger":
                return "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold border border-rose-500/80 shadow-sm";
            case "ghost":
                return "bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent hover:border-zinc-800";
            default:
                return "bg-white text-zinc-950 font-bold hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200 shadow-sm";
        }
    };

    return (
        <motion.button
            type={type}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={onClick}
            className={`group relative w-full sm:w-auto min-h-[48px] md:min-h-[52px] px-6 py-3.5 font-mono text-xs md:text-sm tracking-wider uppercase rounded-xl transition-colors duration-150 flex items-center justify-center gap-2.5 cursor-pointer select-none ${getVariantClasses()} ${className}`}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        </motion.button>
    );
}