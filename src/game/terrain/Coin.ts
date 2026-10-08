import Phaser from 'phaser';
import { COLLISION_CHANNELS } from '../config/physics-channels';

/**
 * Texture key for the coin sprite.
 *
 * There is no coin art in the repository, and a 34px disc is a shape rather than a
 * drawing, so the sprite is generated at boot by {@link createCoinTexture} instead
 * of shipped as a binary. That keeps the coin in step with the palette with nothing
 * to forget to update.
 */
export const COIN_TEXTURE_KEY = 'tetherverse_coin';

/**
 * Draws the coin sprite once.
 *
 * Called from `GameScene.preload`, before any coin is created, because Phaser will
 * not draw an image whose texture does not exist yet.
 */
export function createCoinTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(COIN_TEXTURE_KEY)) return;

    const g = scene.make.graphics({ x: 0, y: 0 }, false);

    // Three passes rather than one: a flat disc reads as a button, whereas a rim,
    // a face and a slot read as currency.
    g.fillStyle(0xc98a12, 1);
    g.fillCircle(32, 32, 28);
    g.fillStyle(0xffc94d, 1);
    g.fillCircle(32, 32, 24);
    g.fillStyle(0xffe9a8, 1);
    g.fillCircle(32, 32, 16);
    g.fillStyle(0xc98a12, 1);
    g.fillRect(29, 16, 6, 32);

    g.generateTexture(COIN_TEXTURE_KEY, 64, 64);
    g.destroy();
}

/**
 * A collectable coin.
 *
 * Coins appear only on risk platforms, which is what makes the risk line worth
 * taking. They are sensors, so a coin is swept up by passing through it and never
 * blocks a landing.
 */
export class Coin extends Phaser.GameObjects.Image {
    public override body!: MatterJS.BodyType;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, COIN_TEXTURE_KEY);

        scene.add.existing(this);
        this.setDisplaySize(34, 34);
        this.setDepth(24);

        // A slow bob, so a coin reads as collectable rather than as scenery.
        scene.tweens.add({
            targets: this,
            y: y - 9,
            duration: 900 + Math.random() * 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.body = scene.matter.add.circle(x, y, 20, {
            isStatic: true,
            isSensor: true,
            label: 'Coin',
            // Matter carries no back-reference to the display object by default.
            // Carrying it here means the scene can recover the coin from a collision
            // pair without searching every coin it has spawned.
            plugin: { gameObject: this },
            collisionFilter: {
                category: COLLISION_CHANNELS.COIN,
                mask: COLLISION_CHANNELS.PLAYER
            }
        }) as MatterJS.BodyType;
    }

    /**
     * Plays the pickup animation.
     *
     * The Matter body is removed here rather than being left to `destroy`, so a
     * sensor stops colliding the instant it is collected instead of firing again on
     * the next frame.
     */
    public collect(): void {
        const body = this.body;

        if (body) {
            this.scene.matter.world.remove(body);
            this.body = undefined as unknown as MatterJS.BodyType;
        }

        this.scene.tweens.add({
            targets: this,
            scale: 1.8,
            alpha: 0,
            duration: 180,
            ease: 'Quad.easeOut',
            onComplete: () => this.destroy()
        });
    }

    public override destroy(fromScene?: boolean): void {
        // The body may already be gone: `collect` removes it before the tween runs.
        if (this.body) {
            this.scene.matter.world.remove(this.body);
            this.body = undefined as unknown as MatterJS.BodyType;
        }

        super.destroy(fromScene);
    }
}