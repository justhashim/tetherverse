// src/game/systems/LaunchSystem.ts

import Phaser from "phaser";
import { Player } from "../entities/Player";
import { GAME_CONSTANTS } from "../config/game-constants";

export class LaunchSystem {
    private scene: Phaser.Scene;
    private player: Player;

    // Performance pre-allocations: Prevents garbage collection stutter loops inside update loops
    private startPoint: Phaser.Math.Vector2;
    private currentPoint: Phaser.Math.Vector2;
    private dragVector: Phaser.Math.Vector2;
    private launchVelocity: Phaser.Math.Vector2;

    private isDragging: boolean = false;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;

        // Initialize reusable vector memory layers
        this.startPoint = new Phaser.Math.Vector2();
        this.currentPoint = new Phaser.Math.Vector2();
        this.dragVector = new Phaser.Math.Vector2();
        this.launchVelocity = new Phaser.Math.Vector2();

        this.setupInputListeners();
    }

    private setupInputListeners(): void {
        // Phaser automatically unifies mouse clicks and touch pointers seamlessly
        this.scene.input.on("pointerdown", this.onPointerDown, this);
        this.scene.input.on("pointermove", this.onPointerMove, this);
        this.scene.input.on("pointerup", this.onPointerUp, this);
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        // Only allow targeting inputs if the player is safely rooted on stable terrain
        if (this.player.playerState !== "IDLE") return;

        this.isDragging = true;
        this.startPoint.set(pointer.x, pointer.y);
        this.player.updateState("AIMING");
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.isDragging) return;

        this.currentPoint.set(pointer.x, pointer.y);

        // Calculate raw input vector offset length
        this.dragVector.copy(this.currentPoint).subtract(this.startPoint);

        // Clamp drag input thresholds
        if (this.dragVector.length() > GAME_CONSTANTS.LAUNCH.MAX_DRAG_DISTANCE) {
            this.dragVector.setLength(GAME_CONSTANTS.LAUNCH.MAX_DRAG_DISTANCE);
        }
    }

    private onPointerUp(): void {
        if (!this.isDragging) return;

        this.isDragging = false;

        const dragDistance = this.dragVector.length();

        if (dragDistance < GAME_CONSTANTS.LAUNCH.MIN_DRAG_DISTANCE) {
            // Cancel input cleanly if drag distance isn't high enough
            this.player.updateState("IDLE");
            return;
        }

        // Mechanics inverted launch operation: player drags backwards, mechanical jack fires forwards!
        // Calculate percentage factor against maximum allowed drag limits
        const powerRatio = dragDistance / GAME_CONSTANTS.LAUNCH.MAX_DRAG_DISTANCE;
        const targetSpeed = GAME_CONSTANTS.LAUNCH.MIN_VELOCITY +
            (powerRatio * (GAME_CONSTANTS.LAUNCH.MAX_VELOCITY - GAME_CONSTANTS.LAUNCH.MIN_VELOCITY));

        // Derive inverse structural angle vector targeting forward flight trajectory
        this.launchVelocity.copy(this.dragVector).normalize().negate().scale(targetSpeed);

        // Execute physical launch operation
        this.player.updateState("LAUNCHED");
        this.scene.matter.body.setVelocity(this.player.body, {
            x: this.launchVelocity.x,
            y: this.launchVelocity.y
        });
    }

    public destroy(): void {
        this.scene.input.off("pointerdown", this.onPointerDown);
        this.scene.input.off("pointermove", this.onPointerMove);
        this.scene.input.off("pointerup", this.onPointerUp);
    }
}