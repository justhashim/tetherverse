import Phaser from "phaser";
import { COLLISION_CHANNELS } from "../config/physics-channels";

export interface SurfaceProperties {
    friction: number;        // Tangential resistance for anchoring
    restitution: number;     // Bounciness on direct impact
    isSlippery?: boolean;    // Custom modifier flag for the Frozen biome
    isCrumbling?: boolean;   // Fragile high-altitude crumbling platform
}

export class BasePlatform extends Phaser.GameObjects.Image {
    public override body!: MatterJS.BodyType;
    public surfaceProps: SurfaceProperties;
    public isCrumblingTriggered: boolean = false;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        width: number,
        height: number,
        props: SurfaceProperties
    ) {
        super(scene, x, y, 'multiverse_platform');
        this.surfaceProps = props;

        scene.add.existing(this);
        const visualWidth = width * 2;
        const visualHeight = height * 2;

        this.setDisplaySize(visualWidth, visualHeight);
        this.setDepth(20);

        if (props.isCrumbling) {
            // Distinct fractured violet/fuchsia appearance for fragile platforms
            this.setTint(0xd946ef);
        }

        this.body = scene.matter.add.rectangle(x, y, visualWidth, visualHeight, {
            isStatic: true,
            friction: props.friction,
            restitution: props.restitution,
            label: "Platform",
            collisionFilter: {
                category: COLLISION_CHANNELS.TERRAIN,
                mask: COLLISION_CHANNELS.PLAYER | COLLISION_CHANNELS.JACK_TIP
            }
        }) as MatterJS.BodyType;
    }

    public triggerCrumble(): void {
        if (!this.surfaceProps.isCrumbling || this.isCrumblingTriggered || !this.active) {
            return;
        }

        this.isCrumblingTriggered = true;

        // 1. Warning vibration shake (1.2 seconds)
        this.scene.tweens.add({
            targets: this,
            x: { from: this.x - 3, to: this.x + 3 },
            duration: 50,
            repeat: 24, // 24 * 50ms = 1200ms
            yoyo: true,
            onComplete: () => {
                // 2. Remove physics collision body so player can no longer stand on it
                if (this.body) {
                    this.scene.matter.world.remove(this.body);
                    this.body = undefined as unknown as MatterJS.BodyType;
                }

                // 3. Shatter drop and dissolve
                this.scene.tweens.add({
                    targets: this,
                    y: this.y + 120,
                    alpha: 0,
                    scaleX: 0.7,
                    duration: 350,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        this.destroy();
                    }
                });
            }
        });
    }

    public override destroy(fromScene?: boolean): void {
        const matterBody = this.body;

        if (matterBody) {
            this.scene.matter.world.remove(matterBody);
            this.body = undefined as unknown as MatterJS.BodyType;
        }

        super.destroy(fromScene);
    }
}