'use client';

import { motion } from "framer-motion";

// Static deterministic shard parameters to avoid impure function calls during React render
const SHARDS = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    width: ((i * 37) % 80) + 40,
    height: ((i * 53) % 150) + 50,
    top: `${((i * 47) % 90) + 5}%`,
    left: `${((i * 71) % 90) + 5}%`,
    rotate: (i * 83) % 360,
    duration: ((i * 19) % 30) + 30
}));

export default function MultiverseBackground() {
    const shards = SHARDS;

    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950">
            {/* Ambient Nebula Matrix */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]" />
            <div className="absolute top-[-40%] left-[-20%] w-[80%] h-[80%] bg-gradient-radial from-violet-900/10 to-transparent blur-[120px]" />
            <div className="absolute bottom-[-40%] right-[-20%] w-[80%] h-[80%] bg-gradient-radial from-cyan-900/10 to-transparent blur-[120px]" />

            {/* Hardware-Accelerated CSS Floating Multiverse Shards */}
            {shards.map((shard) => (
                <motion.div
                    key={shard.id}
                    className="absolute border border-white/3 bg-linear-to-b from-white/2 to-transparent backdrop-blur-[2px]"
                    style={{
                        width: shard.width,
                        height: shard.height,
                        top: shard.top,
                        left: shard.left,
                        transform: `rotate(${shard.rotate}deg)`,
                        clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)"
                    }}
                    animate={{
                        y: [0, -40, 0],
                        rotate: [shard.rotate, shard.rotate + 15, shard.rotate],
                        opacity: [0.1, 0.25, 0.1]
                    }}
                    transition={{
                        duration: shard.duration,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    );
}