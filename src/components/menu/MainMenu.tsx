'use client';

import { useEffect } from "react";
import { motion } from "framer-motion";
import ProfileCard from "./ProfileCard";
import MultiverseBackground from "./MultiverseBackground";
import AnimatedButton from "../shared/AnimatedButton";

interface MainMenuProps {
    onPlay: () => void;
    onOpenLeaderboard: () => void;
    onLogout: () => void;
    user: { name: string; image?: string | null };
    bestAltitude?: number;
}

export default function MainMenu({
    onPlay,
    onOpenLeaderboard,
    onLogout,
    user,
    bestAltitude = 0
}: MainMenuProps) {

    // Keyboard navigation: Enter launches game
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onPlay();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onPlay]);

    return (
        <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-between p-6 md:p-8 z-10 select-none bg-radial-dark">
            <MultiverseBackground />

            {/* TOP BAR INFRASTRUCTURE */}
            <header className="w-full flex justify-between items-center z-20">
                <ProfileCard user={user} bestAltitude={bestAltitude} onLogout={onLogout} />
                <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-slate-400">SECTOR // <span className="text-cyan-300 font-bold">07-GRAVITY</span></span>
                </div>
            </header>

            {/* HERO BRANDING CENTRIC SECTION */}
            <main className="w-full flex flex-col items-center justify-center my-auto z-20 text-center px-4">
                {/* Multiverse Ω Logo Node */}
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mb-5 group"
                >
                    {/* Glowing Aura */}
                    <div className="absolute inset-0 rounded-full bg-linear-to-tr from-violet-600 via-cyan-500 to-fuchsia-500 blur-3xl opacity-25 group-hover:opacity-40 transition-opacity duration-700 scale-110 animate-pulse" />

                    {/* Emblem Node */}
                    <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full border border-cyan-500/30 bg-slate-950/80 backdrop-blur-md shadow-[0_0_50px_rgba(6,182,212,0.2)] flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-2 border border-dashed border-violet-500/30 rounded-full animate-[spin_40s_linear_infinite]" />
                        <div className="absolute inset-5 border border-cyan-500/20 rounded-full animate-[spin_25s_linear_infinite_reverse]" />
                        <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-b from-white via-cyan-100 to-slate-400 tracking-tighter z-10 select-none">
                            Ω
                        </span>
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.8 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase font-sans mb-2 select-none"
                >
                    Tether<span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-violet-400 to-fuchsia-500">verse</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.8 }}
                    className="font-mono text-xs md:text-sm text-cyan-400/80 tracking-[0.35em] uppercase mb-8 select-none"
                >
                    {"// Quantum Singularity Ascent Simulator"}
                </motion.p>

                {/* Main Action Buttons */}
                <motion.div
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.8 }}
                    className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-8 w-full sm:w-auto"
                >
                    <AnimatedButton onClick={onPlay} variant="primary">
                        INITIALIZE ASCENT [↵]
                    </AnimatedButton>
                    <AnimatedButton onClick={onOpenLeaderboard} variant="secondary">
                        TELEMETRY MATRIX
                    </AnimatedButton>
                </motion.div>

                {/* Compact Control Hints */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.8 }}
                    className="hidden md:flex items-center gap-4 font-mono text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm px-5 py-2.5 rounded-2xl shadow-lg"
                >
                    <div className="flex items-center gap-1.5">
                        <span className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            HOLD CLICK / SPACE
                        </span>
                        <span>Grapple</span>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1.5">
                        <span className="bg-slate-900 border border-slate-700 text-violet-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            RELEASE
                        </span>
                        <span>Angular Launch</span>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1.5">
                        <span className="bg-slate-900 border border-slate-700 text-fuchsia-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            A / D
                        </span>
                        <span>Optical Flow</span>
                    </div>
                </motion.div>
            </main>

            {/* FOOTER METADATA ENGINE */}
            <footer className="w-full flex justify-between items-center z-20 font-mono text-[10px] md:text-xs text-slate-500 tracking-wider">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>SYSTEM CORE // ONLINE</span>
                </div>
                <span>v2.4.0-QUANTUM</span>
            </footer>
        </div>
    );
}