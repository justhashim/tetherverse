import Phaser from "phaser";
import { COLLISION_CHANNELS } from "../config/physics-channels";

export class CosmicHazard extends Phaser.GameObjects.Image {
    public override body!: MatterJS.BodyType;
    private baseCenterX: number;
    private baseCenterY: number;
    private range: number;
    private axis: 'x' | 'y';
    private speed: number;
    private rotationSpeed: number;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        textureKey: string,
        range: number = 140,
        axis: 'x' | 'y' = 'x',
        speed: number = 0.0025
    ) {
        super(scene, x, y, textureKey);
        this.baseCenterX = x;
        this.baseCenterY = y;
        this.range = range;
        this.axis = axis;
        this.speed = speed;
        this.rotationSpeed = (Math.random() - 0.5) * 0.03;

        scene.add.existing(this);

        this.setDisplaySize(54, 50);
        this.setDepth(25);
        // Menacing cosmic radioactive red/magenta aura
        this.setTint(0xff2a6d);

        // Circular sensor body so player collision checks can be instantaneous
        const radius = 22;
        this.body = scene.matter.add.circle(x, y, radius, {
            isStatic: true,
            isSensor: true,
            label: "CosmicHazard",
            collisionFilter: {
                category: COLLISION_CHANNELS.HAZARD,
                mask: COLLISION_CHANNELS.PLAYER
            }
        }) as MatterJS.BodyType;
    }

    public update(time: number): void {
        if (!this.active || !this.body) return;

        // Smooth sinusoidal patrol motion across the gap
        const offset = Math.sin(time * this.speed) * this.range;

        if (this.axis === 'x') {
            this.x = this.baseCenterX + offset;
        } else {
            this.y = this.baseCenterY + offset;
        }

        this.rotation += this.rotationSpeed;

        // Sync Matter body with display position
        this.scene.matter.body.setPosition(this.body, { x: this.x, y: this.y });
    }

    public override destroy(fromScene?: boolean): void {
        if (this.body) {
            this.scene.matter.world.remove(this.body);
            this.body = undefined as unknown as MatterJS.BodyType;
        }
        super.destroy(fromScene);
    }
}
