import Phaser, { Scene } from "phaser";
import { Player } from "../entities/Player";
import { GAME_CONSTANTS } from "../config/game-constants";
import { BasePlatform } from "../terrain/BasePlatform";
import { PivotEngine } from "../physics/PivotEngine";
import { COLLISION_CHANNELS } from "../config/physics-channels";

export class GameScene extends Scene {
    private player!: Player;
    private pivotEngine!: PivotEngine;
    private platforms: BasePlatform[] = [];
    private hookNodes: Phaser.Physics.Matter.Image[] = [];
    private backgroundLayer!: Phaser.GameObjects.TileSprite;
    private backgroundObjects: Phaser.GameObjects.Image[] = [];
    private tetherGraphics!: Phaser.GameObjects.Graphics;

    private readonly backgroundObjectTextures = [
        'background-asteroid-1',
        'background-asteroid-2',
        'background-planet-big',
        'background-planet-small',
        'background-blue-stars',
    ];

    private heightText!: Phaser.GameObjects.Text;
    private maxHeightText!: Phaser.GameObjects.Text;

    private groundReferenceY: number = 1200;
    private maxAltitudeMeters: number = 0;

    private lastGeneratedX: number = 0;
    private lastGeneratedY: number = 0;
    private runLowestY: number = 0; // Tracks the highest point reached THIS run to move the death-zone up

    constructor() {
        super("GameScene");
    }

    init() {
        // Keep the local storage check as a fast-loading fallback!
        // It prevents the score from showing '0m' for half a second while the database loads.
        try {
            const saved = localStorage.getItem('maxAltitude');
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed > this.maxAltitudeMeters) {
                    this.maxAltitudeMeters = parsed;
                }
            }
        } catch (e) {
            // Silently ignore
        }

        // 🚀 Fire off the background fetch to sync with the cloud
        this.loadDatabaseHighScore();
    }

    // Fetch the high score from the database and update the static variable
    private async loadDatabaseHighScore() {
        try {
            const response = await fetch('/api/score');

            // If they aren't logged in, the API returns 401 Unauthorized. Just abort silently.
            if (!response.ok) return;

            const data = await response.json();

            // If the cloud score is higher than what the local game thinks...
            if (data.success && data.maxAltitude > this.maxAltitudeMeters) {

                // 1. Update the static variable
                this.maxAltitudeMeters = data.maxAltitude;

                // 2. Sync it back to local storage so the next page refresh is instant
                localStorage.setItem('maxAltitude', data.maxAltitude.toString());

                // 3. Visually update the UI text if it has been created already
                if (this.maxHeightText) {
                    this.maxHeightText.setText(`Max Height: ${this.maxAltitudeMeters}m`);
                }

                console.log(`☁️ Cloud Sync Complete: Loaded ${data.maxAltitude}m`);
            }
        } catch (error) {
            console.error("Failed to sync high score from cloud", error);
        }
    }

    preload() {
        this.load.image('game-background', '/background/background.png');
        this.load.image('background-asteroid-1', '/background/objects/asteroid-1.png');
        this.load.image('background-asteroid-2', '/background/objects/asteroid-2.png');
        this.load.image('background-blue-stars', '/background/objects/blue-stars.png');
        // this.load.image('background-blue-with-stars', '/background/objects/blue-with-stars.png');
        this.load.image('background-planet-big', '/background/objects/prop-planet-big.png');
        this.load.image('background-planet-small', '/background/objects/prop-planet-small.png');
        this.load.image('multiverse_platform', '/assets/platform.png');
        this.load.image('hook_node', '/assets/hook_node.png');

        // Load the player sprite sheet
        this.load.spritesheet('hero_sheet', '/character/hero.png', {
            frameWidth: 280,
            frameHeight: 280,
            margin: 0,
            spacing: 0
        });
    }

    create() {
        this.backgroundLayer = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'game-background')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-2000)
            .setTileScale(3.5, 3.5);

        this.seedBackgroundObjects();

        this.matter.world.setBounds(0, -100000, 20000, 100000 + this.groundReferenceY);
        this.matter.world.setGravity(0, 1.4);

        this.tetherGraphics = this.add.graphics();
        this.tetherGraphics.setDepth(90);

        // Inside src/game/scenes/GameScene.ts -> create()

        if (!this.anims.exists('hero_idle')) {
            // Row 1: Standing Idle (Frames 0 to 4)
            this.anims.create({
                key: 'hero_idle',
                frames: this.anims.generateFrameNumbers('hero_sheet', { start: 0, end: 4 }),
                frameRate: 8,
                repeat: -1
            });

            // Row 2: Crouching / Launch Prep (Frames 5 to 9)
            this.anims.create({
                key: 'hero_aim',
                frames: this.anims.generateFrameNumbers('hero_sheet', { start: 5, end: 9 }),
                frameRate: 10,
                repeat: 0
            });

            // Row 3: Freefall / Tumbling Down (Frames 10 to 14)
            this.anims.create({
                key: 'hero_fall',
                frames: this.anims.generateFrameNumbers('hero_sheet', { start: 10, end: 14 }),
                frameRate: 10,
                repeat: 0
            });

            // Row 4: Air-Drifting / Reaching Pose (Frames 15 to 19)
            this.anims.create({
                key: 'hero_swing',
                frames: this.anims.generateFrameNumbers('hero_sheet', { start: 15, end: 19 }),
                frameRate: 10,
                repeat: 0
            });
        }

        const standardProps = { friction: 0.9, restitution: 0.05 };

        // THE SPAWN PEDESTAL: Shrunk down to a tiny block so you can easily swing off the edge
        this.platforms.push(
            new BasePlatform(this, 200, this.groundReferenceY + 20, 80, 40, standardProps)
        );
        this.spawnHookAnchor(200, this.groundReferenceY + 20 - 120);

        // Initialize player floating slightly above the pedestal
        this.player = new Player(this, 200, this.groundReferenceY - 50);
        this.pivotEngine = new PivotEngine(this, this.player);

        // THE TUTORIAL ANCHOR: Placed at a perfect diagonal angle for the first swing
        this.platforms.push(
            new BasePlatform(this, 450, this.groundReferenceY - 150, 120, 40, standardProps)
        );
        this.spawnHookAnchor(450, this.groundReferenceY - 150 - 120);

        // IN-WORLD TUTORIAL TEXT: Guides the player's eyes and actions perfectly
        this.add.text(250, this.groundReferenceY - 230, "1. Tap & HOLD here to Hook", {
            fontSize: "24px",
            fontFamily: "monospace",
            color: "#00ffcc",
            stroke: "#000000",
            strokeThickness: 4
        });

        this.add.text(440, this.groundReferenceY - 210, "↓", {
            fontSize: "24px",
            fontFamily: "monospace",
            color: "#00ffcc",
            stroke: "#000000",
            strokeThickness: 4
        });

        this.add.text(350, this.groundReferenceY - 50, "2. Keep holding to swing\n3. Release to LAUNCH!", {
            fontSize: "18px",
            fontFamily: "monospace",
            color: "#ffffff",
            align: "center",
            stroke: "#000000",
            strokeThickness: 3
        });

        // Spacing out the rest of the mountain to catch your launch
        this.platforms.push(
            new BasePlatform(this, 800, this.groundReferenceY - 300, 150, 30, standardProps)
        );
        this.spawnHookAnchor(800, this.groundReferenceY - 300 - 120);
        this.platforms.push(
            new BasePlatform(this, 1150, this.groundReferenceY - 450, 150, 30, standardProps)
        );
        this.spawnHookAnchor(1150, this.groundReferenceY - 450 - 120);
        this.platforms.push(
            new BasePlatform(this, 1550, this.groundReferenceY - 650, 200, 150, standardProps)
        );
        this.spawnHookAnchor(1550, this.groundReferenceY - 650 - 160);

        // --- CAMERA SETUP ---
        // Tell the camera to lock onto the player
        // The 'true' enables smooth sub-pixel rendering, and the 0.1 values add a nice elastic lerp (delay)
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Shift the camera focus 200 pixels DOWN
        // This pushes the player toward the bottom third of the screen so you can see what you are jumping to!
        this.cameras.main.setFollowOffset(0, 200);

        // Static UI Height Tracker
        this.heightText = this.add.text(20, 20, "Altitude: 0m", {
            fontSize: "24px",
            fontFamily: "monospace",
            color: "#ffffff"
        }).setScrollFactor(0);

        // Max Height Tracker
        this.maxHeightText = this.add.text(20, 50, `Max Height: ${this.maxAltitudeMeters}m`, {
            fontSize: "18px",
            fontFamily: "monospace",
            color: "#FF0000"
        }).setScrollFactor(0);;

        // Initialize the last generated platform coordinates to the position of the last hardcoded platform
        this.lastGeneratedX = 1550;
        this.lastGeneratedY = this.groundReferenceY - 650;
        this.runLowestY = this.groundReferenceY;
    }

    update(time: number, delta: number) {
        this.updateBackgroundMotion();

        // Update the pivot engine routines
        if (this.pivotEngine) {
            this.pivotEngine.updateEngineRoutines();
        }

        const activeAnchor = this.pivotEngine?.getActiveAnchorPoint();
        if (this.player && activeAnchor && this.pivotEngine?.isCurrentlyHooked()) {
            this.drawQuantumTether(
                this.player.x,
                this.player.y - 10,
                activeAnchor.x,
                activeAnchor.y
            );
        } else if (this.tetherGraphics) {
            this.tetherGraphics.clear();
        }

        this.settlePlayerIfOnSurface();

        if (this.player) {
            // --- FAIL CONDITIONAL CHECK ---
            // If the player falls past the initial base ground zone, execute fail loop
            if (this.player.y > this.groundReferenceY + 400) {
                this.handlePlayerFailure();
                return;
            }

            // Altimeter calculation routines
            if (this.heightText) {
                const pixelHeight = (this.groundReferenceY - this.player.y) - 20;
                const altitudeMeters = Math.max(0, Math.floor(pixelHeight / 10));

                this.heightText.setText(`Altitude: ${altitudeMeters}m`);

                if (altitudeMeters > this.maxAltitudeMeters) {
                    this.maxAltitudeMeters = altitudeMeters;

                    // Bulletproof persistent save
                    localStorage.setItem('maxAltitude', this.maxAltitudeMeters.toString());

                    this.maxHeightText.setText(`Max Height: ${this.maxAltitudeMeters}m`);
                }
            }

            // --- DYNAMIC FAIL CHECK ---
            // Track the highest point reached this specific run (Y decreases as you go up)
            if (this.player.y < this.runLowestY) {
                this.runLowestY = this.player.y;
            }

            // Find the absolute lowest platform still alive in the world (always index 0)
            if (this.platforms.length > 0) {
                // Find the lowest platform, safely skipping any "ghost" undefined array slots
                const lowestPlatform = this.platforms.find(
                    p => p && p.active && p.body && p.body.position
                );

                if (lowestPlatform && lowestPlatform.body && lowestPlatform.body.position) {
                    const voidY = lowestPlatform.y ?? this.groundReferenceY;

                    // You ONLY die if you fall 300px past the lowest existing platform
                    if (voidY !== undefined && this.player.y > voidY + 300) {
                        this.handlePlayerFailure();
                        return;
                    }
                } else if (this.player.y > this.groundReferenceY + 400) {
                    // Fallback for the very beginning of the game
                    this.handlePlayerFailure();
                    return;
                }

                // --- ENDLESS GENERATION & CULLING ---
                // If the player gets within 1000px of the last generated platform, spawn a new one
                if (this.player.y - 1000 < this.lastGeneratedY) {
                    this.generateNextPlatform();
                }

                // Clean up old platforms far below the player to save mobile memory
                this.cleanupOldPlatforms();
            }
        }
    }

    private spawnHookAnchor(x: number, y: number): void {
        const node = this.matter.add.image(x, y, 'hook_node', undefined, {
            isStatic: true,
            isSensor: true,
            label: 'HookAnchor',
            collisionFilter: {
                category: COLLISION_CHANNELS.HOOK_NODE,
                mask: 0
            }
        });

        node.setDisplaySize(80, 80);
        node.setDepth(20);
        this.hookNodes.push(node);
    }

    private seedHookNodes(): void {
        this.hookNodes.forEach(node => node.destroy());
        this.hookNodes = [];

        this.spawnHookAnchor(200, this.groundReferenceY + 20 - 120);
        this.spawnHookAnchor(450, this.groundReferenceY - 150 - 120);
        this.spawnHookAnchor(800, this.groundReferenceY - 300 - 120);
        this.spawnHookAnchor(1150, this.groundReferenceY - 450 - 120);
        this.spawnHookAnchor(1550, this.groundReferenceY - 650 - 160);
    }

    private drawQuantumTether(startX: number, startY: number, targetX: number, targetY: number): void {
        this.tetherGraphics.clear();

        this.tetherGraphics.lineStyle(8, 0xFF007F, 0.4);
        this.tetherGraphics.lineBetween(startX, startY, targetX, targetY);

        this.tetherGraphics.lineStyle(4, 0x00FFCC, 0.8);
        this.tetherGraphics.lineBetween(startX, startY, targetX, targetY);

        this.tetherGraphics.lineStyle(1.5, 0xFFFFFF, 1.0);
        this.tetherGraphics.lineBetween(startX, startY, targetX, targetY);
    }

    private settlePlayerIfOnSurface(): void {
        if (!this.player || this.player.playerState === "AIMING") {
            return;
        }

        const playerRadius = GAME_CONSTANTS.PLAYER.RADIUS;
        const playerBottom = this.player.body.position.y + playerRadius;
        const playerX = this.player.body.position.x;

        for (const platform of this.platforms) {
            if (!platform || !platform.active || !platform.body) {
                continue;
            }

            const platformTop = platform.body.position.y - (platform.displayHeight / 2);
            const platformLeft = platform.body.position.x - (platform.displayWidth / 2) - playerRadius;
            const platformRight = platform.body.position.x + (platform.displayWidth / 2) + playerRadius;
            const withinSurfaceBand = playerBottom >= platformTop - 2 && playerBottom <= platformTop + 8;
            const withinHorizontalBounds = playerX >= platformLeft && playerX <= platformRight;

            if (withinSurfaceBand && withinHorizontalBounds && this.player.body.velocity.y >= 0) {
                this.player.updateState("IDLE");
                return;
            }
        }
    }

    private seedBackgroundObjects() {
        this.backgroundObjects.forEach(object => object.destroy());
        this.backgroundObjects = [];

        const topY = this.groundReferenceY - 3200;
        const bottomY = this.groundReferenceY + 1200;

        let currentY = bottomY;
        while (currentY > topY) {
            const object = this.createBackgroundObject(currentY);
            this.backgroundObjects.push(object);
            currentY -= Phaser.Math.Between(220, 520);
        }
    }

    private createBackgroundObject(y: number) {
        const textureKey = Phaser.Utils.Array.GetRandom(this.backgroundObjectTextures);
        const x = Phaser.Math.Between(-180, this.scale.width + 180);
        const parallax = Phaser.Math.FloatBetween(0.08, 0.25);
        const scale = textureKey.includes('planet')
            ? Phaser.Math.FloatBetween(0.25, 0.6)
            : textureKey.includes('asteroid')
                ? Phaser.Math.FloatBetween(0.15, 0.45)
                : Phaser.Math.FloatBetween(0.45, 0.95);

        const object = this.add.image(x, y, textureKey)
            .setScrollFactor(parallax)
            .setDepth(-1500)
            .setAlpha(textureKey.includes('stars') ? 0.55 : 0.9)
            .setScale(scale)
            .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

        return object;
    }

    private updateBackgroundMotion() {
        if (this.backgroundLayer) {
            this.backgroundLayer.tilePositionY = this.cameras.main.scrollY * 0.25;
            this.backgroundLayer.tilePositionX = this.cameras.main.scrollX * 0.05;
        }

        if (!this.backgroundObjects.length) {
            return;
        }

        const camera = this.cameras.main;
        const worldView = camera.worldView;
        const recycleTop = worldView.top - 1400;
        const recycleBottom = worldView.bottom + 1400;

        for (const object of this.backgroundObjects) {
            if (object.y > recycleBottom) {
                const replacement = this.getBackgroundObjectPlacement(recycleTop);
                object.setPosition(replacement.x, replacement.y);
                this.restyleBackgroundObject(object, replacement.textureKey);
            } else if (object.y < recycleTop) {
                const replacement = this.getBackgroundObjectPlacement(recycleBottom);
                object.setPosition(replacement.x, replacement.y);
                this.restyleBackgroundObject(object, replacement.textureKey);
            }
        }
    }

    private getBackgroundObjectPlacement(y: number) {
        return {
            x: Phaser.Math.Between(-180, this.scale.width + 180),
            y,
            textureKey: Phaser.Utils.Array.GetRandom(this.backgroundObjectTextures)
        };
    }

    private restyleBackgroundObject(object: Phaser.GameObjects.Image, textureKey: string) {
        const scale = textureKey.includes('planet')
            ? Phaser.Math.FloatBetween(0.25, 0.6)
            : textureKey.includes('asteroid')
                ? Phaser.Math.FloatBetween(0.15, 0.45)
                : Phaser.Math.FloatBetween(0.45, 0.95);

        object.setTexture(textureKey);
        object.setScrollFactor(Phaser.Math.FloatBetween(0.08, 0.25));
        object.setAlpha(textureKey.includes('stars') ? 0.55 : 0.9);
        object.setScale(scale);
        object.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }

    private handlePlayerFailure() {
        // 1. Capture and save the high score immediately before anything is destroyed
        if (this.maxAltitudeMeters) {
            this.saveHighScore(this.maxAltitudeMeters);
        }

        // 2. Destroy the previous engine runtime references to safely unbind old event listeners 
        // and eliminate pointer registration leaks
        if (this.pivotEngine) {
            this.pivotEngine.destroy();
        }

        // 3. Trigger a native scene reload framework sequence
        this.scene.restart();
    }
    private generateNextPlatform() {
        const maxJackReach = 280; // Slightly under your 300px max to guarantee it is reachable

        // Randomize the vertical jump distance (climbing between 80px and 180px higher)
        const deltaY = Phaser.Math.Between(-180, -80);

        // Pythagorean Theorem to find the maximum safe horizontal distance
        const maxDeltaX = Math.sqrt(Math.pow(maxJackReach, 2) - Math.pow(deltaY, 2));
        const deltaX = Phaser.Math.Between(-maxDeltaX, maxDeltaX);

        let nextX = this.lastGeneratedX + deltaX;
        let nextY = this.lastGeneratedY + deltaY;

        // Clamp X so the mountain doesn't drift infinitely left or right off into the void
        nextX = Phaser.Math.Clamp(nextX, 0, 3000);

        // Randomize the visual shape
        const width = Phaser.Math.Between(80, 200);
        const height = Phaser.Math.Between(30, 60);

        const p = new BasePlatform(this, nextX, nextY, width, height, { friction: 0.9, restitution: 0.05 });
        this.platforms.push(p);
        this.spawnHookAnchor(nextX, nextY - Math.max(110, height + 40));

        // Update the trackers for the next loop
        this.lastGeneratedX = nextX;
        this.lastGeneratedY = nextY;
    }

    private cleanupOldPlatforms() {
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const p = this.platforms[i] as any;

            //If the object or its physics body is already gone, just drop it from the array
            if (!p || (!p.body && !p.gameObject?.body)) {
                this.platforms.splice(i, 1);
                continue;
            }

            try {
                // extract the Y coordinate depending on how BasePlatform is structured
                const platformY = p.body ? p.body.position.y : p.y;

                // Cull if it's 2000px below the player
                if (platformY > this.player.y + 2000) {
                    if (typeof p.destroy === 'function') {
                        p.destroy();
                    }
                    this.platforms.splice(i, 1);
                }
            } catch (error) {
                // If anything goes wrong reading the position, force remove it to prevent looping crashes
                this.platforms.splice(i, 1);
            }
        }

        for (let i = this.hookNodes.length - 1; i >= 0; i--) {
            const node = this.hookNodes[i];

            if (!node || !node.body) {
                this.hookNodes.splice(i, 1);
                continue;
            }

            const nodeY = node.body.position.y;
            if (nodeY > this.player.y + 2200) {
                node.destroy();
                this.hookNodes.splice(i, 1);
            }
        }
    }

    // Saving high scores to the database (called on game over)
    private async saveHighScore(finalAltitude: number) {
        try {
            const response = await fetch('/api/score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ score: Math.floor(finalAltitude) })
            });

            const data = await response.json();

            if (data.updated) {
                console.log(`🎉 New Personal Best! Saved ${data.newRecord}m to database.`);
                // You could trigger a Phaser UI text here saying "NEW RECORD!"
            }

        } catch (error) {
            console.error("Could not reach the database to save score.", error);
        }
    }
}