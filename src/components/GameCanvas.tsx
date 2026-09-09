"use client";

import Game from "@/src/game/Game";

interface GameCanvasProps {
    isActive?: boolean;
}

export default function GameCanvas({ isActive = true }: GameCanvasProps) {
    return <Game isActive={isActive} />;
}