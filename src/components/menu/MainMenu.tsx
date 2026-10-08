'use client';

import { useEffect } from "react";
import Image from "next/image";
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

    const getStratum = (alt: number) => {
        if (alt >= 1500) return "EXOSPHERE";
        if (alt >= 700) return "MESOSPHERE";
        if (alt >= 350) return "STRATOSPHERE";
        if (alt >= 120) return "TROPOSPHERE";
        return "SURFACE";
    };

    return (
        <div className="relative w-screen min-h-[100dvh] h-[100dvh] overflow-hidden flex flex-col justify-between p-4 sm:p-6 md:p-8 z-10 select-none bg-[#02040a]">
            {/* Layered Cosmic Multiverse Background */}
            <MultiverseBackground />

            {/* TOP BAR: Profile & Sector Status */}
            <header className="w-full flex justify-between items-center z-20 gap-3 pt-1">
                <ProfileCard user={user} bestAltitude={bestAltitude} onLogout={onLogout} />

                <div className="flex items-center gap-2 font-mono text-[10px] md:text-xs bg-slate-950/70 border border-cyan-500/30 px-3 md:px-4 py-2 rounded-xl backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <span className="text-slate-300 font-bold hidden sm:inline">SECTOR //</span>
                    <span className="text-cyan-300 font-black">07-GRAVITY</span>
                </div>
            </header>

            {/* HERO CENTERPIECE: Multiverse Emblem, Title, & Mobile Expedition Pill */}
            <main className="w-full flex flex-col items-center justify-center my-auto z-20 text-center px-2 py-2">
                {/* Official High-Resolution Multiverse Grappling Vortex Emblem */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mb-3 md:mb-5 group cursor-pointer"
                    onClick={onPlay}
                >
                    {/* Pulsing Cosmic Energy Halo */}
                    <div className="absolute inset-[-15%] rounded-full bg-linear-to-tr from-cyan-500 via-violet-600 to-fuchsia-500 blur-2xl md:blur-3xl opacity-35 group-hover:opacity-60 transition-opacity duration-700 animate-pulse" />

                    {/* Rotating Concentric Cyber Rings */}
                    <div className="absolute inset-[-12px] md:inset-[-16px] border border-cyan-400/30 rounded-full animate-[spin_35s_linear_infinite]" />
                    <div className="absolute inset-[-6px] md:inset-[-8px] border border-dashed border-violet-400/40 rounded-full animate-[spin_20s_linear_infinite_reverse]" />

                    {/* Emblem Wrapper */}
                    <motion.div
                        className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full overflow-hidden p-1.5 bg-slate-950/80 border border-cyan-400/50 shadow-[0_0_40px_rgba(6,182,212,0.3)] backdrop-blur-md"
                        animate={{
                            y: [0, -6, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        <Image
                            src="/logo.png"
                            alt="Tetherverse Logo"
                            width={220}
                            height={220}
                            priority
                            className="w-full h-full object-contain rounded-full transform group-hover:scale-105 transition-transform duration-500"
                        />
                    </motion.div>
                </motion.div>

                {/* Game Title */}
                <motion.h1
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.6 }}
                    className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase font-sans mb-1 select-none drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                    Tether<span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-violet-400 to-fuchsia-400">verse</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.6 }}
                    className="font-mono text-[10px] sm:text-xs md:text-sm text-cyan-300/80 tracking-[0.25em] md:tracking-[0.35em] uppercase mb-4 md:mb-6 select-none"
                >
                    {"// QUANTUM ASCENT LOOP • MULTIVERSE EXPEDITION"}
                </motion.p>

                {/* Mobile Expedition Credentials Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35, duration: 0.6 }}
                    className="flex items-center gap-3 sm:gap-6 bg-slate-950/70 border border-violet-500/30 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(139,92,246,0.15)] mb-6 md:mb-8 text-left"
                >
                    <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">
                            SECTOR RECORD
                        </span>
                        <span className="font-mono font-black text-base sm:text-lg text-cyan-300">
                            {bestAltitude.toLocaleString()}
                            <span className="text-cyan-400 text-xs font-normal ml-0.5">m</span>
                        </span>
                    </div>

                    <div className="w-px h-8 bg-slate-800" />

                    <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">
                            STRATUM
                        </span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-violet-300">
                            {getStratum(bestAltitude)}
                        </span>
                    </div>
                </motion.div>

                {/* MOBILE THUMB ACTION ZONE: Primary Launch & Telemetry Buttons */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45, duration: 0.6 }}
                    className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-md"
                >
                    <AnimatedButton onClick={onPlay} variant="primary" className="w-full">
                        <span>▶ INITIALIZE ASCENT</span>
                        <span className="text-[10px] bg-zinc-200/80 border border-zinc-300 text-zinc-800 px-1.5 py-0.5 rounded font-mono font-semibold hidden sm:inline">
                            ↵
                        </span>
                    </AnimatedButton>
                    <AnimatedButton onClick={onOpenLeaderboard} variant="secondary" className="w-full">
                        <span>🏆 TELEMETRY MATRIX</span>
                    </AnimatedButton>
                </motion.div>

                {/* Mobile Touch / Keyboard Control Guide */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55, duration: 0.6 }}
                    className="mt-4 md:mt-6 flex items-center gap-2 font-mono text-[10px] md:text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                    <span className="text-slate-200 font-bold">TAP & HOLD</span>
                    <span>GRAPPLE</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-200 font-bold">RELEASE</span>
                    <span>LAUNCH</span>
                    <span className="text-slate-600 hidden md:inline">•</span>
                    <span className="text-slate-200 font-bold hidden md:inline">[A/D]</span>
                    <span className="hidden md:inline">STEER</span>
                </motion.div>
            </main>

            {/* Footer carries no version string and no status dot. The dot was
                asserting a connection state the client never observes, so it was
                decoration that lied; the version string was a CLI fixture on what is
                effectively a menu page. */}
            <footer className="w-full flex justify-end items-center z-20 font-mono text-[9px] md:text-[11px] text-slate-400 tracking-wider pb-1">
                <span>HOLD SPACE TO LAUNCH</span>
            </footer>
        </div>
    );
}