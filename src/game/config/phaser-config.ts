import Phaser from "phaser";
import { GameScene } from "../scenes/GameScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#050816",

    // Define a base virtual resolution
    width: 1024,
    height: 1600,

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },

    physics: {
        default: "matter",
        matter: {
            gravity: { x: 0, y: 1 },
            debug: false,
        },
    },

    scene: [GameScene],
};