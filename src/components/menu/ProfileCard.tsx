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
        <div className="flex items-center gap-3.5 bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 p-2.5 md:p-3 rounded-xl backdrop-blur-md shadow-sm transition-colors duration-150">
            {/* Avatar Container with solid border */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0 flex items-center justify-center">
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
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-mono font-bold text-sm text-zinc-200 uppercase">
                        {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                )}
                {/* Active node status pip */}
                <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-zinc-950" />
            </div>

            {/* User Meta & Action */}
            <div className="flex flex-col min-w-0 pr-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100 tracking-tight leading-tight truncate max-w-36 md:max-w-48">
                        {user.name}
                    </span>
                    {typeof bestAltitude === 'number' && bestAltitude > 0 && (
                        <span className="font-mono text-[10px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded">
                            {bestAltitude.toLocaleString()}m
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-wider">
                        NODE // LINKED
                    </span>
                    <span className="text-zinc-600 text-[10px]">•</span>
                    <button
                        onClick={onLogout}
                        className="font-mono text-[10px] text-zinc-400 hover:text-rose-400 tracking-wider uppercase transition-colors cursor-pointer"
                    >
                        DISCONNECT
                    </button>
                </div>
            </div>
        </div>
    );
}