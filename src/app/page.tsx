'use client';

import { useState, useEffect, useRef, memo, useCallback } from "react";
import GameCanvas from "@/src/components/GameCanvas";
import { authClient } from "@/src/lib/auth-client";

type AppState = 'intro' | 'menu' | 'playing' | 'leaderboard';

interface GameOverData {
  altitude: number;
  best: number;
}

interface LeaderboardPlayer {
  _id: string;
  name: string;
  image?: string;
  maxAltitude: number;
}

// --- Memoized Leaderboard Row Item ---
const LeaderboardEntry = memo(({ player, index, isCurrentUser }: { player: LeaderboardPlayer, index: number, isCurrentUser: boolean }) => {
  const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500';

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border border-transparent transition-all ${isCurrentUser ? 'bg-slate-700/50 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-slate-800/40 hover:bg-slate-800/70'
      }`}>
      <div className="flex items-center gap-4">
        <span className={`font-black text-xl w-6 ${rankColor}`}>#{index + 1}</span>
        {player.image ? (
          <img src={player.image} alt="" className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400">
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-bold text-lg truncate max-w-37.5">{player.name}</span>
      </div>
      <span className="font-mono text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-violet-400 font-bold text-xl">
        {player.maxAltitude}m
      </span>
    </div>
  );
});
LeaderboardEntry.displayName = 'LeaderboardEntry';


// --- Intro Video Component with Cinematic Fade Transition Out ---
function IntroVideo({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false); // Controls the exit animation opacity
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
      await video.play();
    } catch (err: unknown) {
      // AbortError indicates playback was interrupted by a call to pause() or media removal.
      // This is expected when the user skips, pauses, or unmounts, and should be safely ignored.
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      // If unmuted playback is blocked by browser autoplay policy, fallback to muted
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

  // Triggers the smooth fade out sequence before unmounting the component entirely
  const triggerFadeOut = useCallback(() => {
    if (isFadingOut) return; // Prevent double trigger executions
    setIsFadingOut(true);

    // Pause on the final frame instead of letting the native engine render a black screen
    if (videoRef.current) {
      videoRef.current.pause();
    }

    // Match this timeout exactly to the CSS transition timing duration (1000ms = 1s)
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05)_0%,transparent_60%)] animate-pulse pointer-events-none" />
          <div className="relative font-mono text-sm tracking-[0.4em] text-cyan-400 uppercase animate-[pulse_2s_infinite] text-center px-4 pointer-events-none">
            —CLICK ANYWHERE TO INITIALIZE—
          </div>
        </div>
      ) : (
        <>
          {/* Backdrop click area for skipping */}
          <div
            onClick={triggerFadeOut}
            className="absolute inset-0 z-51 cursor-pointer"
          />

          {/* Hide the skip button smoothly during the fadeout */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerFadeOut();
            }}
            className={`absolute bottom-8 right-8 z-55 bg-black/50 hover:bg-violet-600/40 text-slate-300 hover:text-cyan-400 font-mono text-xs tracking-widest uppercase px-5 py-3 rounded-md border border-slate-800 transition-all backdrop-blur-md ${isFadingOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100"
              }`}
          >
            Skip Intro [SPACE]
          </button>
        </>
      )}
    </div>
  );
}


// --- Main Home Space ---
export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [currentView, setCurrentView] = useState<AppState>('intro');
  const [leaders, setLeaders] = useState<LeaderboardPlayer[]>([]);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(false);

  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [gameKey, setGameKey] = useState(0); // Bump to remount a fresh Phaser run

  const [isMenuMounted, setIsMenuMounted] = useState(currentView === "menu");

  useEffect(() => {
    if (currentView === 'leaderboard') {
      const fetchLeaderboard = async () => {
        setIsLoadingLeaders(true);
        try {
          const res = await fetch('/api/leaderboard');
          const data = await res.json();
          if (data.success) setLeaders(data.leaderboard);
        } catch (error) {
          console.error("Failed to load telemetry data", error);
        } finally {
          setIsLoadingLeaders(false);
        }
      };
      fetchLeaderboard();
    }
  }, [currentView]);

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
    setCurrentView('menu');
  };

  useEffect(() => {
    const handleGameOver = (e: Event) => {
      const detail = (e as CustomEvent<GameOverData>).detail;
      setGameOver(detail);
    };
    window.addEventListener('tetherverse:gameover', handleGameOver);
    return () => window.removeEventListener('tetherverse:gameover', handleGameOver);
  }, []);

  if (isPending) {
    return (
      <main className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center gap-2">
        <div className="w-6 h-6 border-2 border-t-violet-500 border-slate-800 rounded-full animate-spin" />
        <span className="text-slate-500 font-mono text-xs tracking-widest uppercase animate-pulse">Syncing Reality...</span>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.08)_0%,transparent_60%)]" />
        <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">TETHERVERSE</h1>
        <p className="text-slate-500 mb-12 font-mono text-xs tracking-widest uppercase">Fractured Multiverse Grappling Loop</p>
        <button
          onClick={handleLogin}
          className="relative bg-white text-black px-8 py-4 rounded-xl font-mono font-black text-sm tracking-wide uppercase hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          Authorize Node with Google
        </button>
      </main>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-radial-dark text-white select-none">

      {currentView !== 'playing' && currentView !== 'intro' && (
        <button
          onClick={handleLogout}
          className="absolute top-6 right-6 z-50 bg-slate-900/40 hover:bg-red-600/20 text-slate-400 hover:text-red-400 px-4 py-2 rounded-lg border border-slate-800 hover:border-red-500/20 font-mono text-xs tracking-wider transition-all backdrop-blur-sm"
        >
          DISCONNECT NODE
        </button>
      )}

      {/* VIEW A: COEXISTENT INTRUSIVE CINEMATIC LAYER */}
      {currentView === 'intro' && (
        <IntroVideo
          onComplete={() => {
            setIsMenuMounted(true);
            setCurrentView("menu");
          }}
        />)}

      {/* VIEW B: MAIN LAUNCHER INTERFACE (Renders underneath the fadeout layer seamlessly) */}
      {(currentView === 'menu' || isMenuMounted) && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center z-40 bg-slate-950/40 transition-all duration-1000 transform ${currentView === 'menu' ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          }`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.06)_0%,transparent_50%)] pointer-events-none" />

          <div className="relative w-44 h-44 border border-cyan-500/20 rounded-full bg-slate-900/60 backdrop-blur-md flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(6,182,212,0.05)] group">
            <div className="absolute inset-2 border border-dashed border-violet-500/20 rounded-full animate-[spin_40s_linear_infinite]" />
            <span className="text-5xl font-black text-slate-300 tracking-tighter">Ω</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-black text-white mb-1 tracking-tighter uppercase">
            Tether<span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-violet-400 to-fuchsia-500">verse</span>
          </h1>
          <p className="text-green-400/80 mb-12 text-xs font-mono tracking-[0.25em] uppercase">
            Welcome back, client::{session.user.name.split(' ')[0]}
          </p>

          <div className="flex gap-6 z-10">
            <button
              onClick={() => setCurrentView('playing')}
              className="bg-linear-to-r from-cyan-500 to-violet-600 text-white px-10 py-4 rounded-xl font-mono font-black text-sm tracking-widest hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all active:scale-95 border border-cyan-400/20"
            >
              INITIALIZE ASCENT
            </button>
            <button
              onClick={() => setCurrentView('leaderboard')}
              className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 px-8 py-4 rounded-xl font-mono font-bold text-sm tracking-widest transition-all active:scale-95 border border-slate-800 hover:border-slate-700"
            >
              TELEMETRY LIST
            </button>
          </div>
        </div>
      )}

      {/* VIEW C: GLOBAL RANKINGS PANEL */}
      {currentView === 'leaderboard' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-slate-950/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg bg-slate-900/40 border border-violet-500/20 rounded-2xl flex flex-col shadow-2xl overflow-hidden h-[75vh]">

            <div className="p-6 border-b border-slate-800/80 bg-slate-950/40 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Global Rankings</h2>
                <p className="text-xs font-mono text-slate-500 tracking-wider">Top Dimensional Quantum Distances</p>
              </div>
              <button
                onClick={() => setCurrentView('menu')}
                className="font-mono text-xs bg-slate-950 border border-slate-800 hover:border-cyan-500/30 px-3 py-1.5 rounded-lg text-slate-400 hover:text-cyan-400 transition-all"
              >
                [ESC] RETURN
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-950/10">
              {isLoadingLeaders ? (
                <div className="flex flex-col justify-center items-center h-full gap-2 font-mono text-xs text-slate-500 uppercase tracking-widest">
                  <div className="w-5 h-5 border border-t-cyan-400 border-transparent rounded-full animate-spin" />
                  Processing Stream...
                </div>
              ) : leaders.length === 0 ? (
                <div className="flex justify-center items-center h-full text-slate-500 font-mono text-sm">
                  No tracking vectors found in this sector.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {leaders.map((player, index) => (
                    <LeaderboardEntry
                      key={player._id}
                      player={player}
                      index={index}
                      isCurrentUser={player._id === session.user.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW D: RUNTIME CORE ENGINE CONTAINER */}
      {currentView === 'playing' && (
        <div className="w-full h-full relative z-30">
          <button
            onClick={() => setCurrentView('menu')}
            className="absolute top-6 left-6 z-50 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-red-400 px-4 py-2 rounded-lg border border-slate-800 hover:border-red-500/30 font-mono text-xs font-bold backdrop-blur-sm transition-all shadow-lg"
          >
            ← ABORT ASCENT
          </button>
          <GameCanvas key={gameKey} />

          {/* GAME OVER OVERLAY */}
          {gameOver && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(139,92,246,0.16)_0%,transparent_60%)] pointer-events-none" />

              <div className="relative w-full max-w-md bg-slate-900/50 border border-violet-500/25 rounded-2xl shadow-2xl shadow-violet-950/40 overflow-hidden p-8 text-center">
                {/* top accent line */}
                <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-cyan-400/60 to-transparent" />

                {/* Ω multiverse emblem with rotating dashed ring */}
                <div className="relative w-20 h-20 mx-auto border border-cyan-500/20 rounded-full bg-slate-900/60 flex items-center justify-center">
                  <div className="absolute inset-2 border border-dashed border-violet-500/20 rounded-full animate-[spin_40s_linear_infinite]" />
                  <span className="text-3xl font-black text-slate-300">Ω</span>
                </div>

                <p className="mt-6 font-mono text-[10px] tracking-[0.4em] text-violet-400 uppercase">
                  Node Status // Terminated
                </p>
                <h1 className="mt-1 font-black text-5xl tracking-tight uppercase">
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-violet-400 to-fuchsia-500">
                    Signal Lost
                  </span>
                </h1>
                <p className="mt-1 text-slate-500 font-mono text-xs tracking-widest uppercase">
                  Ascent terminated // Rift collapsed
                </p>

                {gameOver.altitude >= gameOver.best && gameOver.altitude > 0 && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 font-mono text-xs tracking-widest text-cyan-300 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    New Dimensional Record
                  </div>
                )}

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
                    <p className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase">Altitude</p>
                    <p className="mt-1 font-mono font-black text-3xl text-cyan-400">
                      {gameOver.altitude}m
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
                    <p className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase">Record</p>
                    <p className="mt-1 font-mono font-black text-3xl text-violet-400">
                      {gameOver.best}m
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3">
                  <button
                    onClick={handleRerun}
                    className="bg-linear-to-r from-cyan-500 to-violet-600 text-white px-8 py-4 rounded-xl font-mono font-black text-sm tracking-widest hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all active:scale-95 border border-cyan-400/20"
                  >
                    ▶ RERUN ASCENT
                  </button>
                  <button
                    onClick={handleExitToLauncher}
                    className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 px-8 py-3.5 rounded-xl font-mono font-bold text-sm tracking-widest transition-all active:scale-95 border border-slate-800 hover:border-slate-700"
                  >
                    EXIT TO LAUNCHER
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