import Phaser from "phaser";
import { GAME_CONSTANTS } from "../config/game-constants";
import { COLLISION_CHANNELS } from "../config/physics-channels";

export type PlayerState = "IDLE" | "AIMING" | "LAUNCHED" | "FALLING";

export class Player extends Phaser.GameObjects.Sprite {
    public override body!: MatterJS.BodyType;
    public playerState: PlayerState = "IDLE";

    private coreBodyRadius: number;
    private readonly baseScale: number = 0.35; // 98px / 280px frame size

    // Optical flow tracking properties
    private facingDirection: number = 1; // 1 = facing right, -1 = facing left
    private facingScale: number = 1.0;   // Continuous optical transition between 1.0 and -1.0
    private currentTilt: number = 0;     // Aerodynamic banking rotation (radians)

    constructor(scene: Phaser.Scene, x: number, y: number) {
        // Frame 1 is the base idle pose (matches the 2-frame breathing idle anim), so the
        // sprite spawns already in a stable idle pose instead of flashing a tumbling frame.
        super(scene, x, y, "hero_sheet", 1);

        this.coreBodyRadius = GAME_CONSTANTS.PLAYER.RADIUS;

        this.setDisplaySize(98, 98);
        this.setOrigin(0.5, 0.5);
        this.setFlipX(false);


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
            frictionStatic: GAME_CONSTANTS.PLAYER.FRICTION_STATIC,
            frictionAir: GAME_CONSTANTS.PLAYER.FRICTION_AIR,
            restitution: GAME_CONSTANTS.PLAYER.BOUNCE,
            label: "PlayerBody",
            collisionFilter: {
                category: COLLISION_CHANNELS.PLAYER,
                mask: 0xFFFFFFFF
            }
        };

        scene.matter.add.gameObject(this, targetConfig);

        // Lock rotation by giving the body infinite rotational inertia. This is how
        // matter-js implements a "fixed rotation" so the body settles on platforms
        // without micro-bouncing (setFixedRotation is not exposed in this version).
        this.scene.matter.body.setInertia(this.body, Infinity);

        // --- 4. SAFE ANIMATION TRIGGER ---
        if (scene.anims.exists('hero_idle')) {
            this.play('hero_idle');
        }
    }

    public updateState(newState: PlayerState): void {
        if (this.playerState === newState) return;
        this.playerState = newState;
        this.stop();

        // Per-state air drag for controlled, punchy movement.
        if (newState === "LAUNCHED") {
            this.body.frictionAir = GAME_CONSTANTS.SWING.FRICTION_AIR;
        } else if (newState === "FALLING") {
            this.body.frictionAir = GAME_CONSTANTS.SWING.FALLING_FRICTION_AIR;
        } else {
            this.body.frictionAir = GAME_CONSTANTS.PLAYER.FRICTION_AIR;
        }

        if (newState === "IDLE") {
            this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
            this.scene.matter.body.setAngularVelocity(this.body, 0);
            this.play('hero_idle', true);
        } else if (newState === "AIMING") {
            this.play('hero_aim', true);
        } else if (newState === "LAUNCHED") {
            this.play('hero_swing', true);
        } else if (newState === "FALLING") {
            this.play('hero_fall', true);
        }
    }

    /**
     * Updates the sprite mirroring, 2.5D card-turn perspective scaling, and aerodynamic
     * optical flow tilt based on player trajectory, tether arc, and route geometry.
     */
    public updateOpticalFlow(
        delta: number,
        routeDirection: number,
        activeAnchorPoint?: Phaser.Math.Vector2 | null,
        isHooked?: boolean
    ): void {
        if (!this.body) return;

        const vx = this.body.velocity.x;
        const vy = this.body.velocity.y;
        const speed = Math.hypot(vx, vy);

        // 1. Determine target facing direction (-1 for left, 1 for right)
        if (isHooked && activeAnchorPoint) {
            // When hooked, face the direction of the swing arc; if near apex, look toward the anchor
            if (Math.abs(vx) > 1.0) {
                this.facingDirection = vx > 0 ? 1 : -1;
            } else {
                const dxToAnchor = activeAnchorPoint.x - this.x;
                if (Math.abs(dxToAnchor) > 20) {
                    this.facingDirection = dxToAnchor > 0 ? 1 : -1;
                }
            }
        } else if (this.playerState === "LAUNCHED" || this.playerState === "FALLING") {
            // Airborne flight: face horizontal momentum with a hysteresis deadzone to prevent flickering
            if (vx > 1.0) {
                this.facingDirection = 1;
            } else if (vx < -1.0) {
                this.facingDirection = -1;
            }
        } else if (this.playerState === "IDLE") {
            // On ground: face upcoming route direction
            if (routeDirection !== 0) {
                this.facingDirection = routeDirection;
            }
        } else if (this.playerState === "AIMING" && activeAnchorPoint) {
            // Aiming pose: face the targeted anchor node
            const dx = activeAnchorPoint.x - this.x;
            if (Math.abs(dx) > 20) {
                this.facingDirection = dx > 0 ? 1 : -1;
            }
        }

        // 2. Smooth Optical Scale Turn (perspective card-turn)
        // Swift, fluid ~100ms transition between 1.0 and -1.0
        const turnSpeed = 16.0;
        const dt = Math.min(0.05, delta / 1000);
        const turnAlpha = Math.min(1, turnSpeed * dt);
        this.facingScale = Phaser.Math.Linear(this.facingScale, this.facingDirection, turnAlpha);

        // Optical squash and stretch:
        // As facingScale passes through 0 (edge-on), subtly elongate vertically (+8%)
        const turnStretch = 1.0 + (1.0 - Math.abs(this.facingScale)) * 0.08;

        // Aerodynamic speed elongation along flight path
        const speedStretch = Math.min(0.10, Math.max(0, (speed - 8) * 0.012));

        // Always keep flipX = false and drive mirroring strictly through scaleX
        this.setFlipX(false);
        this.scaleX = this.baseScale * this.facingScale * (1 - speedStretch * 0.3);
        this.scaleY = this.baseScale * turnStretch * (1 + speedStretch);

        // 3. Aerodynamic Optical Flow Tilt / Banking
        let targetTilt = 0;
        if (isHooked && activeAnchorPoint) {
            // Tethered: bank into the pendulum swing arc
            const dx = this.x - activeAnchorPoint.x;
            const dy = this.y - activeAnchorPoint.y;
            const ropeAngle = Math.atan2(dx, -dy);
            targetTilt = Phaser.Math.Clamp(ropeAngle * 0.4, -0.45, 0.45);
        } else if (this.playerState === "LAUNCHED" || this.playerState === "FALLING") {
            // Airborne: lean into horizontal velocity
            targetTilt = Phaser.Math.Clamp(vx * 0.022, -0.32, 0.32);
        } else {
            // Grounded: upright stance
            targetTilt = 0;
        }

        const tiltRate = 8.0;
        const tiltAlpha = Math.min(1, tiltRate * dt);
        this.currentTilt = Phaser.Math.Linear(this.currentTilt, targetTilt, tiltAlpha);
        this.setRotation(this.currentTilt);
    }

    public updateSpriteDirection(velocityX: number): void {
        if (Math.abs(velocityX) > 0.8) {
            this.facingDirection = velocityX > 0 ? 1 : -1;
        }
    }

    public freeze(): void {
        this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
        this.scene.matter.body.setAngularVelocity(this.body, 0);
    }
}