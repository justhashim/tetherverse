'use client';

import { memo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { LeaderboardPlayer } from "@/src/types/game";

interface LeaderboardEntryProps {
    player: LeaderboardPlayer;
    rank: number;
    isCurrentUser: boolean;
}

function LeaderboardEntry({ player, rank, isCurrentUser }: LeaderboardEntryProps) {
    const [imageError, setImageError] = useState(false);

    const getRankStyles = (r: number) => {
        switch (r) {
            case 1:
                return {
                    badge: "bg-linear-to-br from-amber-400 to-yellow-600 text-slate-950 font-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]",
                    row: "bg-linear-to-r from-amber-950/20 via-slate-900/40 to-slate-900/20 border-amber-500/30",
                    icon: "👑",
                };
            case 2:
                return {
                    badge: "bg-linear-to-br from-slate-200 to-slate-400 text-slate-950 font-black border-slate-200 shadow-[0_0_10px_rgba(226,232,240,0.4)]",
                    row: "bg-linear-to-r from-slate-800/30 via-slate-900/40 to-slate-900/20 border-slate-400/20",
                    icon: "🥈",
                };
            case 3:
                return {
                    badge: "bg-linear-to-br from-amber-700 to-amber-900 text-amber-100 font-black border-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.3)]",
                    row: "bg-linear-to-r from-amber-950/15 via-slate-900/40 to-slate-900/20 border-amber-700/20",
                    icon: "🥉",
                };
            default:
                return {
                    badge: "bg-slate-950/60 text-slate-400 border-slate-800",
                    row: "bg-slate-900/30 border-slate-800/60 hover:border-slate-700/80",
                    icon: `#${r}`,
                };
        }
    };

    const rankStyle = getRankStyles(rank);

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${isCurrentUser
                ? "bg-linear-to-r from-cyan-950/40 via-slate-900/60 to-violet-950/30 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                : rankStyle.row
                }`}
        >
            <div className="flex items-center gap-3.5 min-w-0">
                {/* Ranking Token Badge */}
                <div className={`w-8 h-8 rounded-lg border font-mono text-xs flex items-center justify-center shrink-0 ${rankStyle.badge}`}>
                    {rankStyle.icon}
                </div>

                {/* Profile Vector Frame */}
                <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shrink-0 flex items-center justify-center">
                    {player.image && !imageError ? (
                        <Image
                            src={player.image}
                            alt={player.name}
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-400 uppercase">
                            {player.name ? player.name.charAt(0) : '?'}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 truncate">
                    <span className={`text-sm font-bold truncate ${isCurrentUser ? "text-cyan-200" : "text-slate-200"}`}>
                        {player.name}
                    </span>
                    {isCurrentUser && (
                        <span className="font-mono text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                            YOU
                        </span>
                    )}
                </div>
            </div>

            {/* Score Metric */}
            <div className="text-right pl-3 shrink-0">
                <span className="font-mono text-base font-black text-transparent bg-clip-text bg-linear-to-r from-cyan-300 to-violet-400">
                    {player.maxAltitude.toLocaleString()}
                    <span className="text-cyan-400 text-xs font-normal ml-0.5">m</span>
                </span>
            </div>
        </motion.div>
    );
}

export default memo(LeaderboardEntry);