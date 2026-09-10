'use client';

import { motion } from "framer-motion";
import Image from "next/image";

// Deterministic star field nodes to avoid SSR hydration mismatches
const STARS = Array.from({ length: 28 }).map((_, i) => ({
    id: i,
    top: `${((i * 37 + 13) % 92) + 4}%`,
    left: `${((i * 67 + 23) % 94) + 3}%`,
    size: (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1.5),
    color: i % 4 === 0 ? 'rgba(0, 245, 255, 0.85)' : i % 4 === 1 ? 'rgba(168, 85, 247, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    duration: ((i * 11) % 4) + 2.5,
    delay: ((i * 7) % 3) * 0.8,
}));

export default function MultiverseBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#030611]">
            {/* Layer 1: High-Res Deep Cosmic Nebula Texture with Parallax Drift */}
            <motion.div
                className="absolute inset-[-5%] w-[110%] h-[110%]"
                animate={{
                    scale: [1, 1.04, 1],
                    x: [0, -10, 0],
                    y: [0, -8, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <Image
                    src="/background/background.png"
                    alt=""
                    fill
                    priority
                    className="object-cover opacity-80 mix-blend-screen"
                />
            </motion.div>

            {/* Layer 2: Atmospheric Cosmic Nebulae & Dimensional Rifts */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.22)_0%,rgba(139,92,246,0.18)_35%,rgba(2,4,10,0.85)_80%)]" />
            <div className="absolute top-[-20%] left-[-15%] w-[70vw] h-[70vw] rounded-full bg-violet-600/15 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-15%] w-[75vw] h-[75vw] rounded-full bg-cyan-500/15 blur-[120px]" />

            {/* Layer 3: Celestial Bodies (Planets & Asteroids) */}
            {/* Big Cosmic Planet */}
            <motion.div
                className="absolute top-[8%] right-[5%] md:top-[12%] md:right-[10%] w-16 h-16 md:w-24 md:h-24 drop-shadow-[0_0_25px_rgba(139,92,246,0.5)]"
                animate={{
                    y: [0, -12, 0],
                    rotate: [0, 10, 0],
                }}
                transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <Image
                    src="/background/objects/prop-planet-big.png"
                    alt=""
                    width={96}
                    height={96}
                    className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                />
            </motion.div>

            {/* Small Companion Planet */}
            <motion.div
                className="absolute top-[42%] left-[4%] md:left-[8%] w-8 h-8 md:w-12 md:h-12 opacity-80 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                animate={{
                    y: [0, 10, 0],
                    x: [0, 6, 0],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                }}
            >
                <Image
                    src="/background/objects/prop-planet-small.png"
                    alt=""
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                />
            </motion.div>

            {/* Drifting Asteroid 1 */}
            <motion.div
                className="absolute bottom-[30%] left-[10%] md:left-[14%] w-9 h-8 opacity-70"
                animate={{
                    y: [0, -15, 0],
                    rotate: [0, 360],
                }}
                transition={{
                    duration: 32,
                    repeat: Infinity,
                    ease: "linear",
                }}
            >
                <Image
                    src="/background/objects/asteroid-1.png"
                    alt=""
                    width={36}
                    height={32}
                    className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                />
            </motion.div>

            {/* Drifting Asteroid 2 */}
            <motion.div
                className="absolute top-[20%] left-[12%] w-6 h-5 opacity-60"
                animate={{
                    y: [0, 12, 0],
                    rotate: [360, 0],
                }}
                transition={{
                    duration: 24,
                    repeat: Infinity,
                    ease: "linear",
                }}
            >
                <Image
                    src="/background/objects/asteroid-2.png"
                    alt=""
                    width={24}
                    height={20}
                    className="w-full h-full object-contain"
                />
            </motion.div>

            {/* Layer 4: Twinkling Celestial Starfield */}
            {STARS.map((star) => (
                <motion.span
                    key={star.id}
                    className="absolute rounded-full"
                    style={{
                        top: star.top,
                        left: star.left,
                        width: star.size,
                        height: star.size,
                        backgroundColor: star.color,
                        boxShadow: `0 0 ${star.size * 3}px ${star.color}`,
                    }}
                    animate={{
                        opacity: [0.2, 0.95, 0.2],
                        scale: [0.8, 1.3, 0.8],
                    }}
                    transition={{
                        duration: star.duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: star.delay,
                    }}
                />
            ))}

            {/* Layer 5: Perspective 3D Cyber-Grid Horizon at Bottom */}
            <div className="absolute bottom-0 inset-x-0 h-48 md:h-64 overflow-hidden pointer-events-none opacity-40">
                {/* Horizontal glowing beam */}
                <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(6,182,212,1)]" />
                {/* 3D Perspective Plane */}
                <div
                    className="w-full h-full origin-top"
                    style={{
                        transform: "perspective(300px) rotateX(68deg)",
                        backgroundImage:
                            "linear-gradient(to right, rgba(6, 182, 212, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 92, 246, 0.25) 1px, transparent 1px)",
                        backgroundSize: "36px 36px",
                    }}
                />
                {/* Bottom Fade Mask */}
                <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-transparent" />
            </div>

            {/* Layer 6: Vignette Readability Overlays for Mobile Top & Bottom */}
            <div className="absolute top-0 inset-x-0 h-32 bg-linear-to-b from-slate-950/90 via-slate-950/50 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-44 bg-linear-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>
    );
}