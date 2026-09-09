"use client";

import { useEffect, useRef } from "react";

interface GameProps {
  // Add any component props here if needed
}

export default function Game() {
  const gameRef = useRef<any>(null); // Using any temporarily as Phaser is dynamically loaded
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 2. Ensure the container div is physically loaded in the DOM tree before running
    if (!containerRef.current) return;

    // 3. Keep a flag to prevent double-initialization in React Strict Mode
    let isDestroyed = false;

    async function initPhaser() {
      try {
        // 4. Dynamically import Phaser so it ONLY loads on the client browser
        const Phaser = (await import("phaser")).default;
        const { gameConfig } = await import("./config/phaser-config");

        // Check if the component unmounted while downloading the library
        if (isDestroyed) return;

        if (!gameRef.current && containerRef.current) {
          gameRef.current = new Phaser.Game({
            ...gameConfig,
            parent: containerRef.current, // Pass the direct node reference safely
          });
        }
      } catch (err) {
        console.error("Failed to load or initialize Phaser engine:", err);
      }
    }

    initPhaser();

    return () => {
      isDestroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef} // This guarantees Phaser can target the canvas without racing the DOM
      id="game-container"
      style={{
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}