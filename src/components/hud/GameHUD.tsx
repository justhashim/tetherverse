'use client';

import { useState, useEffect } from 'react';

interface GameHUDProps {
    onAbort: () => void;
}

interface AltitudeDetail {
    altitude: number;
    maxAltitude: number;
    zone: string;
}

interface CoinDetail {
    coins: number;
    banked: number;
    pending: number;
}

export default function GameHUD({ onAbort }: GameHUDProps) {
    const [altitude, setAltitude] = useState<number>(0);
    const [maxAltitude, setMaxAltitude] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('maxAltitude');
            return saved ? parseInt(saved, 10) || 0 : 0;
        }
        return 0;
    });
    const [zone, setZone] = useState<string>('SURFACE');
    const [coins, setCoins] = useState<CoinDetail>({ coins: 0, banked: 0, pending: 0 });

    useEffect(() => {
        const handleAltitudeUpdate = (e: Event) => {
            const detail = (e as CustomEvent<AltitudeDetail>).detail;
            if (detail) {
                setAltitude(detail.altitude);
                setMaxAltitude(detail.maxAltitude);
                if (detail.zone) setZone(detail.zone);
            }
        };

        const handleCoinUpdate = (e: Event) => {
            const detail = (e as CustomEvent<CoinDetail>).detail;
            if (detail) setCoins(detail);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onAbort();
            }
        };

        window.addEventListener('tetherverse:altitude-update', handleAltitudeUpdate);
        window.addEventListener('tetherverse:coin-update', handleCoinUpdate);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('tetherverse:altitude-update', handleAltitudeUpdate);
            window.removeEventListener('tetherverse:coin-update', handleCoinUpdate);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onAbort]);

    const isNewRecord = altitude > maxAltitude && altitude > 0;

    const getZoneColor = (z: string) => {
        switch (z) {
            case 'TROPOSPHERE':
                return 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]';
            case 'STRATOSPHERE':
                return 'border-violet-500/40 bg-violet-950/40 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]';
            case 'MESOSPHERE':
                return 'border-fuchsia-500/40 bg-fuchsia-950/40 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.2)]';
            case 'EXOSPHERE':
                return 'border-amber-500/40 bg-amber-950/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse';
            case 'SURFACE':
            default:
                return 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
        }
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden">
            {/* Top Navigation & Telemetry Bar */}
            <header className="w-full flex items-start justify-between">
                {/* Abort Ascent Action */}
                <button
                    onClick={onAbort}
                    className="pointer-events-auto group flex items-center gap-2.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-rose-900/50 text-zinc-400 hover:text-rose-200 px-3.5 py-2 rounded-xl font-mono text-xs font-semibold tracking-wider backdrop-blur-md transition-all duration-150 shadow-sm active:scale-[0.98] cursor-pointer select-none"
                    aria-label="Abort Current Ascent"
                >
                    <span className="text-base group-hover:-translate-x-0.5 transition-transform">←</span>
                    <span>ABORT ASCENT</span>
                    <span className="text-[10px] bg-zinc-900 group-hover:bg-rose-950/60 text-zinc-500 group-hover:text-rose-300 px-1.5 py-0.5 rounded border border-zinc-800 group-hover:border-rose-800/40">
                        ESC
                    </span>
                </button>

                {/* Coin Purse. Pending coins are shown dimmed because they are on the
                    mountain, not banked: the run can still take them. */}
                <div
                    className="pointer-events-auto flex flex-col items-start gap-1 bg-slate-950/70 border border-amber-500/30 backdrop-blur-md rounded-2xl px-4 py-3 shadow-[0_0_30px_rgba(245,158,11,0.12)]"
                    title="Coins are kept when you land on solid ground. Coins on the risk line are lost if the run ends first."
                >
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-950/40 text-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                        <span>COINS</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="font-mono font-black text-2xl md:text-3xl text-white tracking-tight">
                            {coins.coins.toLocaleString()}
                        </span>
                    </div>
                    {coins.pending > 0 && (
                        <div className="font-mono text-[10px] tracking-wider text-amber-400/80">
                            <span className="text-amber-300 font-bold">+{coins.pending}</span> UNBANKED
                        </div>
                    )}
                </div>

                {/* Cyberpunk Altimeter Module */}
                <div className="pointer-events-auto flex flex-col items-end gap-1.5 bg-slate-950/70 border border-cyan-500/30 backdrop-blur-md rounded-2xl px-5 py-3 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    {/* Stratum Zone Badge */}
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${getZoneColor(zone)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                            <span>ZONE // {zone}</span>
                        </div>
                    </div>

                    {/* Main Digital Altitude Metric */}
                    <div className="flex items-baseline gap-1">
                        <span className="font-mono text-xs text-slate-500 tracking-widest uppercase mr-1">ALT</span>
                        <span className="font-mono font-black text-3xl md:text-4xl text-white tracking-tight">
                            {altitude.toLocaleString().padStart(4, '0')}
                        </span>
                        <span className="font-mono font-bold text-cyan-400 text-sm md:text-base tracking-wide">
                            m
                        </span>
                    </div>

                    {/* Personal Best / Record Indicator */}
                    <div className="font-mono text-[11px] tracking-wider">
                        {isNewRecord ? (
                            <span className="inline-flex items-center gap-1 font-bold text-cyan-300 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                                <span>⚡</span>
                                <span>NEW RECORD!</span>
                            </span>
                        ) : (
                            <span className="text-slate-400">
                                BEST: <span className="text-violet-400 font-bold">{maxAltitude.toLocaleString()}m</span>
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Bottom Floating Control HUD */}
            <footer className="w-full flex justify-center pb-2">
                <div className="flex items-center gap-2 md:gap-3 bg-slate-950/70 border border-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full font-mono text-[10px] md:text-[11px] text-slate-400 tracking-wider uppercase shadow-xl">
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-slate-300 font-bold">HOLD [CLICK/SPACE]</span> TETHER
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 font-bold">RELEASE</span> LAUNCH
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="text-slate-300 font-bold hidden sm:inline">[A/D]</span>
                    <span className="hidden sm:inline">STEER</span>
                </div>
            </footer>
        </div>
    );
}

