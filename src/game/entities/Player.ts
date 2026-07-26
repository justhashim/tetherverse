import Phaser from "phaser";
import { GAME_CONSTANTS } from "../config/game-constants";

export type PlayerState = "IDLE" | "AIMING" | "LAUNCHED" | "FALLING";

export class Player extends Phaser.GameObjects.Sprite {
    public override body!: MatterJS.BodyType;
    public playerState: PlayerState = "IDLE";

    private coreBodyRadius: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "player", 10);

        this.coreBodyRadius = GAME_CONSTANTS.PLAYER.RADIUS;

        this.setDisplaySize(128, 128);

        this.setOrigin(0.5, 0.65);

        // --- 2. DEPTH & MULTIVERSE GLOW ---
        this.setDepth(100);

        const selfWithPostFX = this as Phaser.GameObjects.Sprite & {
            postFX?: {
                addGlow: (color: number, intensity: number, blur: number, knockout: boolean) => void;
            };
        };
        if (selfWithPostFX.postFX) {
            selfWithPostFX.postFX.addGlow(0xFF007F, 3, 0, false);
        }

        scene.add.existing(this);

        // --- 3. MATTER.JS PHYSICS BODY ---
        const targetConfig: Phaser.Types.Physics.Matter.MatterBodyConfig = {
            shape: { type: 'circle', radius: this.coreBodyRadius },
            density: GAME_CONSTANTS.PLAYER.DENSITY,
            friction: GAME_CONSTANTS.PLAYER.FRICTION,
            frictionAir: GAME_CONSTANTS.PLAYER.FRICTION_AIR,
            restitution: GAME_CONSTANTS.PLAYER.BOUNCE,
            label: "PlayerBody"
        };

        scene.matter.add.gameObject(this, targetConfig);
        this.scene.matter.body.setInertia(this.body, Infinity);

        // --- 4. SAFE ANIMATION TRIGGER ---
        if (scene.anims.exists('hero_idle')) {
            this.play('hero_idle');
        }
    }

    public updateState(newState: PlayerState): void {
        if (this.playerState === newState) return;
        this.playerState = newState;

        if (!this.scene.anims.exists('hero_idle')) return;

        switch (newState) {
            case "IDLE":
                this.play('hero_idle', true);
                break;
            case "AIMING":
                this.play('hero_swing', true);
                break;
            case "LAUNCHED":
            case "FALLING":
                this.play('hero_launch', true);
                break;
        }
    }

    public updateSpriteDirection(velocityX: number): void {
        if (velocityX > 0.5) {
            this.setFlipX(false);
        } else if (velocityX < -0.5) {
            this.setFlipX(true);
        }
    }

    public freeze(): void {
        this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
        this.scene.matter.body.setAngularVelocity(this.body, 0);
    }
}