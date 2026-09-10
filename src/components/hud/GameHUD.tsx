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

interface HazardAlert {
    title: string;
    message: string;
    severity?: 'warning' | 'danger';
    durationMs?: number;
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
    const [hazardAlert, setHazardAlert] = useState<HazardAlert | null>(null);

    useEffect(() => {
        const handleAltitudeUpdate = (e: Event) => {
            const detail = (e as CustomEvent<AltitudeDetail>).detail;
            if (detail) {
                setAltitude(detail.altitude);
                setMaxAltitude(detail.maxAltitude);
                if (detail.zone) setZone(detail.zone);
            }
        };

        let alertTimer: NodeJS.Timeout | null = null;
        const handleHazardAlert = (e: Event) => {
            const detail = (e as CustomEvent<HazardAlert>).detail;
            if (detail) {
                setHazardAlert(detail);
                if (alertTimer) clearTimeout(alertTimer);
                alertTimer = setTimeout(() => {
                    setHazardAlert(null);
                }, detail.durationMs || 3500);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onAbort();
            }
        };

        window.addEventListener('tetherverse:altitude-update', handleAltitudeUpdate);
        window.addEventListener('tetherverse:hazard-alert', handleHazardAlert);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            if (alertTimer) clearTimeout(alertTimer);
            window.removeEventListener('tetherverse:altitude-update', handleAltitudeUpdate);
            window.removeEventListener('tetherverse:hazard-alert', handleHazardAlert);
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
                    className="pointer-events-auto group flex items-center gap-2.5 bg-slate-950/70 hover:bg-red-950/50 border border-slate-800/80 hover:border-red-500/40 text-slate-400 hover:text-red-300 px-4 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wider backdrop-blur-md transition-all duration-200 shadow-xl hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95"
                    aria-label="Abort Current Ascent"
                >
                    <span className="text-base group-hover:-translate-x-0.5 transition-transform">←</span>
                    <span>ABORT ASCENT</span>
                    <span className="text-[10px] bg-slate-900 group-hover:bg-red-900/60 text-slate-500 group-hover:text-red-300 px-1.5 py-0.5 rounded border border-slate-800 group-hover:border-red-500/30">
                        ESC
                    </span>
                </button>

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
                        <span className="font-mono font-black text-3xl md:text-4xl text-transparent bg-clip-text bg-linear-to-r from-white via-cyan-100 to-cyan-400 tracking-tight drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
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

            {/* Cybernetic Hazard Warning Banner */}
            {hazardAlert && (
                <div className="w-full flex justify-center mt-2 md:mt-3 pointer-events-none transition-all duration-300 animate-bounce">
                    <div className={`flex items-center gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl font-mono tracking-wider ${hazardAlert.severity === 'danger'
                            ? 'bg-rose-950/85 border-rose-500/80 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                            : 'bg-amber-950/85 border-amber-500/80 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                        }`}>
                        <span className="text-lg md:text-xl animate-pulse">
                            {hazardAlert.severity === 'danger' ? '☣️' : '⚠️'}
                        </span>
                        <div className="flex flex-col text-left">
                            <span className="font-black uppercase tracking-widest text-[11px] text-white">
                                {hazardAlert.title}
                            </span>
                            <span className="text-[10px] opacity-90">
                                {hazardAlert.message}
                            </span>
                        </div>
                    </div>
                </div>
            )}

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

