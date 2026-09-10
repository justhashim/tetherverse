'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProfileCardProps {
    user: { name: string; image?: string | null };
    bestAltitude?: number;
    onLogout: () => void;
}

export default function ProfileCard({ user, bestAltitude, onLogout }: ProfileCardProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="flex items-center gap-3.5 bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/30 p-2.5 md:p-3 rounded-2xl backdrop-blur-md shadow-2xl transition-all duration-300">
            {/* Avatar Container with glowing border */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-900 shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                {user.image && !imageError ? (
                    <Image
                        src={user.image}
                        alt={user.name}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full bg-linear-to-br from-cyan-600 to-violet-700 flex items-center justify-center font-mono font-black text-sm text-white uppercase">
                        {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                )}
                {/* Active node status pip */}
                <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </div>

            {/* User Meta & Action */}
            <div className="flex flex-col min-w-0 pr-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 tracking-tight leading-tight truncate max-w-36 md:max-w-48">
                        {user.name}
                    </span>
                    {typeof bestAltitude === 'number' && bestAltitude > 0 && (
                        <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.2 rounded">
                            {bestAltitude.toLocaleString()}m
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[9px] text-emerald-400/80 uppercase tracking-wider">
                        NODE // LINKED
                    </span>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <button
                        onClick={onLogout}
                        className="font-mono text-[10px] text-slate-400 hover:text-red-400 tracking-wider uppercase transition-colors"
                    >
                        DISCONNECT
                    </button>
                </div>
            </div>
        </div>
    );
}