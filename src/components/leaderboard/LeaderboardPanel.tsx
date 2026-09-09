// src/components/leaderboard/LeaderboardPanel.tsx
'use client';

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

    return (
        <div className="absolute inset-0 w-full h-full bg-slate-950/70 z-40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-xl h-[85vh] bg-slate-900/60 border border-violet-500/20 rounded-2xl flex flex-col shadow-[0_0_60px_rgba(139,92,246,0.1)] overflow-hidden"
            >
                {/* Holographic Border Flare */}
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,1)]" />

                {/* Component Executive Header */}
                <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter text-white uppercase">
                            Leaderboard Telemetry
                        </h2>
                        <p className="text-xs font-mono text-slate-400 tracking-wider">
                            Top Dimensions Quantum Distances
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="font-mono text-xs border border-slate-800 hover:border-cyan-500/30 px-3 py-1.5 rounded bg-slate-900 text-slate-400 hover:text-cyan-400 transition-all"
                    >
                        [ESC] RETURN
                    </button>
                </div>

                {/* Entry Scroll Space */}
                <div className="flex-1 overflow-y-auto p-6 space-y-2.5 custom-scrollbar bg-slate-950/20">
                    {loading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                                Processing Stream...
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
    );
}