// src/game/physics/PivotEngine.ts

import Phaser from "phaser";
import { Player } from "../entities/Player";
import { COLLISION_CHANNELS } from "../config/physics-channels";

export class PivotEngine {
    private scene: Phaser.Scene;
    private player: Player;

    private pivotConstraint: MatterJS.ConstraintType | null = null;
    private anchorPoint: Phaser.Math.Vector2;
    private pointerVector: Phaser.Math.Vector2;

    private isHooked: boolean = false;
    private jackLength: number = 340; // Comfortably reaches the first anchor from the start platform
    private anchorHitRadius: number = 60; // Forgiving tap detection near the hook node
    private debugGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.anchorPoint = new Phaser.Math.Vector2();
        this.pointerVector = new Phaser.Math.Vector2();

        this.debugGraphics = this.scene.add.graphics().setDepth(99);

        this.scene.matter.body.set(this.player.body, "collisionFilter", {
            category: COLLISION_CHANNELS.PLAYER,
            mask: COLLISION_CHANNELS.TERRAIN
        });

        this.setupInputBindings();
    }

    private setupInputBindings(): void {
        // Pass 'true' to indicate this is a fresh, initial tap
        this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.attemptAnchor(pointer), this);
        this.scene.input.on("pointerup", this.releaseAnchor, this);
    }

    private attemptAnchor(pointer: Phaser.Input.Pointer): void {
        if (this.isHooked) return;

        this.pointerVector.set(pointer.worldX - this.player.x, pointer.worldY - this.player.y);

        if (this.pointerVector.length() > this.jackLength) {
            this.pointerVector.setLength(this.jackLength);
        }

        const hookAnchors = this.scene.matter.world.getAllBodies().filter(
            (body: MatterJS.BodyType) => body.label === 'HookAnchor'
        );

        let aimedAnchor: MatterJS.BodyType | null = null;
        let aimedDistance = Number.POSITIVE_INFINITY;

        for (const body of hookAnchors) {
            const distanceToPointer = Phaser.Math.Distance.Between(
                pointer.worldX,
                pointer.worldY,
                body.position.x,
                body.position.y
            );

            const distanceToPlayer = Phaser.Math.Distance.Between(
                this.player.body.position.x,
                this.player.body.position.y,
                body.position.x,
                body.position.y
            );

            if (
                distanceToPointer <= this.anchorHitRadius &&
                distanceToPlayer <= this.jackLength &&
                distanceToPointer < aimedDistance
            ) {
                aimedAnchor = body;
                aimedDistance = distanceToPointer;
            }
        }

        if (!aimedAnchor) {
            return;
        }

        this.anchorPoint.set(aimedAnchor.position.x, aimedAnchor.position.y);
        this.isHooked = true;
        this.player.updateState("LAUNCHED");

        this.pivotConstraint = this.scene.matter.add.constraint(
            this.player.body as MatterJS.BodyType,
            aimedAnchor,
            Phaser.Math.Distance.Between(
                this.player.body.position.x,
                this.player.body.position.y,
                aimedAnchor.position.x,
                aimedAnchor.position.y
            ),
            0.2,
            {
                pointA: { x: 0, y: 0 },
                pointB: { x: 0, y: 0 }
            }
        );
    }

    public updateEngineRoutines(): void {
        this.debugGraphics.clear();
        const pointer = this.scene.input.activePointer;

        // Draw your max reach circle
        // this.debugGraphics.lineStyle(2, 0xffffff, 0.2);
        // this.debugGraphics.strokeCircle(this.player.x, this.player.y, this.jackLength);

        // The Yellow Aiming Laser (Allows drag-to-scan without hopping)
        if (pointer.isDown && !this.isHooked) {
            this.attemptAnchor(pointer); // Scans for a wall hook while dragging

            this.pointerVector.set(pointer.worldX - this.player.x, pointer.worldY - this.player.y);
            if (this.pointerVector.length() > this.jackLength) {
                this.pointerVector.setLength(this.jackLength);
            }
            const previewX = this.player.x + this.pointerVector.x;
            const previewY = this.player.y + this.pointerVector.y;

            this.debugGraphics.lineStyle(3, 0xffcc00, 0.5);
            this.debugGraphics.lineBetween(this.player.x, this.player.y, previewX, previewY);
        }

        // Early return if not hooked
        if (!this.isHooked || !this.pivotConstraint) return;

        // Draw the actual swinging rope and apply physics
        this.debugGraphics.lineStyle(5, 0x00ffcc, 1);
        this.debugGraphics.lineBetween(this.player.x, this.player.y, this.anchorPoint.x, this.anchorPoint.y);
        this.debugGraphics.fillStyle(0xff3333, 1);
        this.debugGraphics.fillCircle(this.anchorPoint.x, this.anchorPoint.y, 6);

        if (pointer.isDown) {
            const swingRadius = new Phaser.Math.Vector2(
                this.player.x - this.anchorPoint.x,
                this.player.y - this.anchorPoint.y
            );
            const tangent = new Phaser.Math.Vector2(-swingRadius.y, swingRadius.x).normalize();

            const driveForce = 0.12; // Swing acceleration pump while holding (was 0.01, far too weak)

            this.scene.matter.body.applyForce(
                this.player.body,
                this.player.body.position,
                { x: tangent.x * driveForce, y: tangent.y * driveForce }
            );
        }
    }

    public getActiveAnchorPoint(): Phaser.Math.Vector2 | null {
        if (!this.isHooked) {
            return null;
        }

        return new Phaser.Math.Vector2(this.anchorPoint.x, this.anchorPoint.y);
    }

    public isCurrentlyHooked(): boolean {
        return this.isHooked;
    }

    private releaseAnchor(): void {
        if (!this.isHooked) return;

        const swingVelocity = this.player.body.velocity;

        this.isHooked = false;
        this.anchorPoint.set(0, 0);
        if (this.pivotConstraint) {
            this.scene.matter.world.remove(this.pivotConstraint);
            this.pivotConstraint = null;
        }

        // Boost the built-up swing velocity so releasing actually flings the player
        // toward the next platform ("Release to LAUNCH!").
        const launchBoost = 1.3;
        this.scene.matter.body.setVelocity(this.player.body, {
            x: swingVelocity.x * launchBoost,
            y: swingVelocity.y * launchBoost
        });

        this.player.updateState("FALLING");
    }

    public destroy(): void {
        this.scene.input.off("pointerdown", this.attemptAnchor);
        this.scene.input.off("pointerup", this.releaseAnchor);
        this.releaseAnchor();
        this.debugGraphics.destroy();
    }
}