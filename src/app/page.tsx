'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import NextImage from "next/image";
import GameCanvas from "@/src/components/GameCanvas";
import GameHUD from "@/src/components/hud/GameHUD";
import MainMenu from "@/src/components/menu/MainMenu";
import LeaderboardPanel from "@/src/components/leaderboard/LeaderboardPanel";
import MultiverseBackground from "@/src/components/menu/MultiverseBackground";
import { authClient } from "@/src/lib/auth-client";

type AppState = 'intro' | 'menu' | 'playing' | 'leaderboard';

interface GameOverData {
  altitude: number;
  best: number;
}

// --- Cinematic Intro Video Component with Sound Activation & Fade ---
function IntroVideo({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
      await video.play();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        try {
          video.muted = true;
          await video.play();
        } catch (fallbackErr: unknown) {
          if (fallbackErr instanceof DOMException && fallbackErr.name === "AbortError") {
            return;
          }
          console.warn("Muted video playback fallback failed:", fallbackErr);
        }
        return;
      }
      console.warn("Video playback encountered an error:", err);
    }
  };

  const handleStartIntro = () => {
    setHasInteracted(true);
    startPlayback();
  };

  const triggerFadeOut = useCallback(() => {
    if (isFadingOut) return;
    setIsFadingOut(true);

    if (videoRef.current) {
      videoRef.current.pause();
    }

    fadeTimeoutRef.current = setTimeout(() => {
      onComplete();
    }, 1000);
  }, [isFadingOut, onComplete]);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasInteracted) return;

    const handleSkip = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Escape") {
        e.preventDefault();
        triggerFadeOut();
      }
    };

    window.addEventListener("keydown", handleSkip);
    return () => window.removeEventListener("keydown", handleSkip);
  }, [hasInteracted, triggerFadeOut]);

  return (
    <div
      className={`fixed inset-0 w-screen h-screen bg-black z-50 overflow-hidden transition-opacity duration-1000 ease-out select-none ${isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
    >
      <video
        ref={videoRef}
        src="/videos/intro.mp4"
        className="w-full h-full object-cover pointer-events-none"
        playsInline
        preload="auto"
        onEnded={triggerFadeOut}
      />

      {!hasInteracted ? (
        <div
          onClick={handleStartIntro}
          className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col items-center justify-center z-55 cursor-pointer select-none overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.06)_0%,transparent_60%)] animate-pulse pointer-events-none" />
          <div className="relative font-mono text-xs md:text-sm tracking-[0.4em] text-cyan-400 uppercase animate-[pulse_2s_infinite] text-center px-4 pointer-events-none">
            — CLICK ANYWHERE TO INITIALIZE —
          </div>
        </div>
      ) : (
        <>
          <div
            onClick={triggerFadeOut}
            className="absolute inset-0 z-51 cursor-pointer"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerFadeOut();
            }}
            className={`absolute bottom-8 right-8 z-55 bg-black/60 hover:bg-violet-600/40 text-slate-300 hover:text-cyan-300 font-mono text-xs tracking-widest uppercase px-5 py-3 rounded-xl border border-slate-800 transition-all backdrop-blur-md ${isFadingOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100"
              }`}
          >
            SKIP INTRO [SPACE]
          </button>
        </>
      )}
    </div>
  );
}

// --- Main Application Root ---
export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [currentView, setCurrentView] = useState<AppState>('intro');
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [isMenuMounted, setIsMenuMounted] = useState(currentView === "menu");
  const [bestAltitude, setBestAltitude] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maxAltitude');
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });

  const handleLogin = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  };

  const handleLogout = async () => {
    await authClient.signOut({ fetchOptions: { onSuccess: () => window.location.reload() } });
  };

  const handleRerun = () => {
    setGameOver(null);
    setGameKey((k) => k + 1);
  };

  const handleExitToLauncher = () => {
    setGameOver(null);
    setGameKey((k) => k + 1);
    setCurrentView('menu');
  };

  // Sync best altitude from live altitude updates
  useEffect(() => {
    const handleAltitude = (e: Event) => {
      const detail = (e as CustomEvent<{ maxAltitude: number }>).detail;
      if (detail?.maxAltitude) {
        setBestAltitude(detail.maxAltitude);
      }
    };
    window.addEventListener('tetherverse:altitude-update', handleAltitude);
    return () => window.removeEventListener('tetherverse:altitude-update', handleAltitude);
  }, []);

  // Sync game over events
  useEffect(() => {
    const handleGameOver = (e: Event) => {
      const detail = (e as CustomEvent<GameOverData>).detail;
      setGameOver(detail);
      if (detail?.best) {
        setBestAltitude(detail.best);
      }
    };
    window.addEventListener('tetherverse:gameover', handleGameOver);
    return () => window.removeEventListener('tetherverse:gameover', handleGameOver);
  }, []);

  // Keyboard controls during Game Over overlay
  useEffect(() => {
    if (!gameOver) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleRerun();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleExitToLauncher();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  // Eagerly pre-warm heavy game engine modules and assets in the background
  useEffect(() => {
    const prewarm = async () => {
      try {
        await Promise.all([
          import("phaser"),
          import("@/src/game/config/phaser-config"),
        ]);
        const textures = [
          '/background/background.png',
          '/assets/platform.png',
          '/assets/hook_node.png',
          '/character/hero.png',
        ];
        textures.forEach((src) => {
          const img = new window.Image();
          img.src = src;
        });
      } catch {
        // Silently ignore background prewarm hiccups
      }
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => prewarm());
      } else {
        setTimeout(prewarm, 200);
      }
    }
  }, []);

  // Pre-mount GameCanvas in the background once session is ready
  useEffect(() => {
    if (session) {
      const timer = setTimeout(() => {
        setIsMenuMounted(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [session]);

  // View: Loading Session
  if (isPending) {
    return (
      <main className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 select-none">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <div className="absolute inset-1.5 border-2 border-b-violet-500 border-r-transparent border-t-transparent border-l-transparent rounded-full animate-[spin_1s_linear_infinite_reverse]" />
        </div>
        <span className="text-slate-400 font-mono text-xs tracking-[0.3em] uppercase animate-pulse">
          Synthesizing Reality...
        </span>
      </main>
    );
  }

  // View: Unauthenticated Dimensional Terminal Gate
  if (!session) {
    return (
      <main className="relative w-screen h-screen overflow-hidden bg-radial-dark flex flex-col items-center justify-center p-6 select-none">
        <MultiverseBackground />

        <div className="relative z-10 w-full max-w-md bg-slate-950/70 border border-violet-500/30 rounded-3xl p-8 md:p-10 backdrop-blur-xl shadow-[0_0_60px_rgba(139,92,246,0.15)] text-center flex flex-col items-center">
          {/* Top Holographic Flare */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)]" />

          {/* Central Logo Node */}
          <div className="relative w-28 h-28 mb-5 rounded-full border border-cyan-400/50 bg-slate-950/80 p-1.5 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.35)]">
            <div className="absolute inset-[-6px] border border-dashed border-violet-400/40 rounded-full animate-[spin_30s_linear_infinite]" />
            <NextImage
              src="/logo.png"
              alt="Tetherverse Logo"
              width={104}
              height={104}
              priority
              className="w-full h-full object-contain rounded-full"
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase mb-1">
            Tether<span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-violet-400 to-fuchsia-500">verse</span>
          </h1>
          <p className="font-mono text-xs text-slate-400 tracking-[0.25em] uppercase mb-8">
            Dimensional Ascent Portal
          </p>

          <button
            onClick={handleLogin}
            className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-950 font-mono font-bold text-sm tracking-wider uppercase px-6 py-4 rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_35px_rgba(255,255,255,0.3)] active:scale-95 cursor-pointer"
          >
            {/* Google "G" SVG */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Authorize Node with Google</span>
          </button>

          <div className="mt-8 font-mono text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>TERMINAL // GATEWAY READY</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative w-screen min-h-[100dvh] h-[100dvh] overflow-hidden bg-[#02040a] text-white select-none">
      {/* Intro Video Layer */}
      {currentView === 'intro' && (
        <IntroVideo
          onComplete={() => {
            setIsMenuMounted(true);
            setCurrentView("menu");
          }}
        />
      )}

      {/* Main Launcher Interface */}
      {(currentView === 'menu' || currentView === 'leaderboard' || isMenuMounted) && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${currentView === 'menu' || currentView === 'leaderboard'
            ? "z-20 opacity-100 pointer-events-auto"
            : "z-0 opacity-0 pointer-events-none"
            }`}
        >
          <MainMenu
            onPlay={() => setCurrentView('playing')}
            onOpenLeaderboard={() => setCurrentView('leaderboard')}
            onLogout={handleLogout}
            user={session.user}
            bestAltitude={bestAltitude}
          />
        </div>
      )}

      {/* Global Rankings Telemetry Panel */}
      {currentView === 'leaderboard' && (
        <LeaderboardPanel
          onClose={() => setCurrentView('menu')}
          currentUserId={session.user.id}
        />
      )}

      {/* Active Game Canvas & In-Game React HUD */}
      {(currentView === 'playing' || isMenuMounted) && (
        <div
          className={`w-full h-full absolute inset-0 transition-opacity duration-700 ${currentView === 'playing'
            ? "z-30 opacity-100 pointer-events-auto"
            : "z-10 opacity-30 pointer-events-none"
            }`}
        >
          <GameCanvas key={gameKey} isActive={currentView === 'playing'} />

          {currentView === 'playing' && (
            <GameHUD onAbort={handleExitToLauncher} />
          )}

          {/* Game Over Modal (Signal Lost) */}
          {gameOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(239,68,68,0.12)_0%,rgba(139,92,246,0.12)_40%,transparent_70%)] pointer-events-none" />

              <div className="relative w-full max-w-md bg-slate-900/70 border border-violet-500/30 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.25)] overflow-hidden p-7 md:p-8 text-center backdrop-blur-xl">
                {/* Top Glowing Red Accent */}
                <div className="absolute top-0 inset-x-0 h-0.5 bg-linear-to-r from-transparent via-red-500/80 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.8)]" />

                {/* Multiverse Emblem */}
                <div className="relative w-20 h-20 mx-auto rounded-full border border-red-500/40 bg-slate-950/80 p-1 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                  <div className="absolute inset-[-4px] border border-dashed border-red-500/30 rounded-full animate-[spin_20s_linear_infinite]" />
                  <NextImage
                    src="/logo.png"
                    alt=""
                    width={72}
                    height={72}
                    className="w-full h-full object-contain rounded-full filter hue-rotate-180 brightness-95"
                  />
                </div>

                <p className="mt-5 font-mono text-[10px] tracking-[0.4em] text-red-400 uppercase">
                  Node Status // Signal Lost
                </p>
                <h2 className="mt-1 font-black text-4xl md:text-5xl tracking-tight uppercase text-transparent bg-clip-text bg-linear-to-r from-red-400 via-rose-300 to-amber-300">
                  Rift Collapsed
                </h2>
                <p className="mt-1 text-slate-400 font-mono text-xs tracking-widest uppercase">
                  Descent threshold exceeded
                </p>

                {/* New Record Fanfare */}
                {gameOver.altitude >= gameOver.best && gameOver.altitude > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/50 px-4 py-1.5 font-mono text-xs tracking-widest text-cyan-300 uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    ⚡ New Dimensional Record!
                  </div>
                )}

                {/* Stat Grid */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                    <p className="font-mono text-[10px] tracking-[0.25em] text-slate-400 uppercase">
                      Final Altitude
                    </p>
                    <p className="mt-1 font-mono font-black text-3xl text-cyan-400">
                      {gameOver.altitude}
                      <span className="text-sm font-normal text-cyan-500 ml-0.5">m</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                    <p className="font-mono text-[10px] tracking-[0.25em] text-slate-400 uppercase">
                      Sector Best
                    </p>
                    <p className="mt-1 font-mono font-black text-3xl text-violet-400">
                      {gameOver.best}
                      <span className="text-sm font-normal text-violet-500 ml-0.5">m</span>
                    </p>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="mt-7 flex flex-col gap-3">
                  <button
                    onClick={handleRerun}
                    className="group relative bg-linear-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white px-8 py-3.5 rounded-xl font-mono font-black text-sm tracking-widest hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all active:scale-95 border border-cyan-400/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>▶ RE-ENGAGE ASCENT</span>
                    <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-normal text-cyan-200">
                      SPACE / ↵
                    </span>
                  </button>
                  <button
                    onClick={handleExitToLauncher}
                    className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white px-8 py-3 rounded-xl font-mono font-bold text-xs tracking-widest transition-all active:scale-95 border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>RETURN TO LAUNCHER</span>
                    <span className="text-[10px] text-slate-500">[ESC]</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}