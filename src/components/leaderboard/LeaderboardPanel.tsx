// src/components/leaderboard/LeaderboardPanel.tsx
'use client';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LeaderboardPlayer } from "@/src/types/game";
import LeaderboardEntry from "./LeaderBoardEntry";

interface LeaderboardPanelProps {
    onClose: () => void;
    currentUserId: string;
}

export default function LeaderboardPanel({ onClose, currentUserId }: LeaderboardPanelProps) {
    const [leaders, setLeaders] = useState<LeaderboardPlayer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            try {
                const res = await fetch('/api/leaderboard');
                const data = await res.json();
                if (data.success) setLeaders(data.leaderboard);
            } catch (err) {
                console.error("Telemetry failure fetching leaderboard:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboardData();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 w-full h-full bg-slate-950/80 z-50 backdrop-blur-md flex items-center justify-center p-4 select-none"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-xl h-[82vh] bg-slate-900/80 border border-violet-500/30 rounded-2xl flex flex-col shadow-[0_0_60px_rgba(139,92,246,0.15)] overflow-hidden"
                >
                    {/* Holographic Border Flare */}
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)]" />

                    {/* Header */}
                    <div className="p-5 md:p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/50">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                                    Telemetry Matrix
                                </h2>
                            </div>
                            <p className="text-xs font-mono text-slate-400 tracking-wider mt-0.5">
                                Top Dimensional Ascent Records ({leaders.length} Tracked)
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="font-mono text-xs border border-slate-800 hover:border-cyan-500/40 px-3 py-1.5 rounded-lg bg-slate-900/80 text-slate-400 hover:text-cyan-300 transition-all active:scale-95"
                        >
                            [ESC] RETURN
                        </button>
                    </div>

                    {/* Entry Scroll Space */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 custom-scrollbar bg-slate-950/30">
                        {loading ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                <div className="w-7 h-7 border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                                <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">
                                    Synthesizing Sector Data...
                                </span>
                            </div>
                        ) : leaders.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">
                                NO DATAPOINTS RECORDED IN THIS SECTOR
                            </div>
                        ) : (
                            leaders.map((player, index) => (
                                <LeaderboardEntry
                                    key={player._id}
                                    player={player}
                                    rank={index + 1}
                                    isCurrentUser={player._id === currentUserId}
                                />
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}