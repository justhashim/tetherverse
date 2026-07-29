import Phaser from "phaser";
import { COLLISION_CHANNELS } from "../config/physics-channels";

export interface SurfaceProperties {
    friction: number;        // Tangential resistance for anchoring
    restitution: number;     // Bounciness on direct impact
    isSlippery?: boolean;    // Custom modifier flag for the Frozen biome
}

export class BasePlatform extends Phaser.GameObjects.Image {
    public override body!: MatterJS.BodyType;
    public surfaceProps: SurfaceProperties;

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

    public override destroy(fromScene?: boolean): void {
        const matterBody = this.body;

        if (matterBody) {
            this.scene.matter.world.remove(matterBody);
            this.body = undefined as unknown as MatterJS.BodyType;
        }

        super.destroy(fromScene);
    }
}