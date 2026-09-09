import Phaser, { Scene } from "phaser";
import { Player } from "../entities/Player";
import { GAME_CONSTANTS } from "../config/game-constants";
import { BasePlatform } from "../terrain/BasePlatform";
import { PivotEngine } from "../physics/PivotEngine";
import { LevelGenerator } from "../levels/LevelGenerator";

export class GameScene extends Scene {
    private player!: Player;
    private pivotEngine!: PivotEngine;
    private levelGenerator!: LevelGenerator;
    private platforms: BasePlatform[] = [];
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
    private currentAltitudeMeters: number = 0; // Live altitude used to pick the difficulty tier
    private levelSeed: number = 0;

    private runLowestY: number = 0; // Tracks the highest point reached THIS run to move the death-zone up

    private isGameOver: boolean = false;
    private campGraceTimer: number = 0; // Accumulated ms spent resting below the death-void
    private cameraFollowOffsetX: number = 0;

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
        } catch {
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

        this.matter.world.setGravity(0, 1.4);

        this.tetherGraphics = this.add.graphics();
        this.tetherGraphics.setDepth(90);

        // Inside src/game/scenes/GameScene.ts -> create()

        if (!this.anims.exists('hero_idle')) {
            // Row 1: Subtle 2-frame breathing idle (frames 1-2). Frames 0 and 3-4 in the
            // sheet are not center-aligned with the rest of the row, so looping the full
            // row makes the sprite visibly slide/hop; frames 1-2 share the same baseline.
            this.anims.create({
                key: 'hero_idle',
                frames: this.anims.generateFrameNumbers('hero_sheet', { start: 1, end: 2 }),
                frameRate: 2,
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

        // Replace the platform & player initialization inside create() in GameScene.ts:

        // --- STARTING PLATFORM & PLAYER SPAWN FIX ---
        const standardProps = { friction: 0.9, restitution: 0.05 };

        // 1. Center starting platform at x = 250 (directly in line with tutorial lane)
        const platformX = 250;
        const platformY = this.groundReferenceY + 20;

        // Standardize all terrain as BasePlatform (visual = 280x80, matching the old sprite)
        const startPlatform = new BasePlatform(this, platformX, platformY, 140, 40, standardProps);

        const spawnX = startPlatform.x; // Exact center X of the platform body

        // Compute the surface spawn point BEFORE instantiating the player so it never
        // starts at Y=0 and drops from the sky on frame 1.
        const spawnY =
            startPlatform.y -
            (startPlatform.displayHeight / 2) -
            GAME_CONSTANTS.PLAYER.RADIUS;

        // Create player centered directly on the platform's top surface
        this.player = new Player(this, spawnX, spawnY);

        // Store the start platform in the standard array so it is treated uniformly
        this.platforms.push(startPlatform);

        // Reset velocity/forces and set initial state so gravity does not yank Jack down
        this.player.updateState("IDLE");

        this.matter.body.setVelocity(this.player.body, { x: 0, y: 0 });
        this.matter.body.setAngularVelocity(this.player.body, 0);

        const body = this.player.body as MatterJS.BodyType;
        body.force.x = 0;
        body.force.y = 0;
        body.torque = 0;

        // Initialize PivotEngine
        this.pivotEngine = new PivotEngine(this, this.player);

        // --- TUTORIAL ANCHORS & TEXT ALIGNMENT ---
        // Placed ahead at x = 450 for a clean diagonal grapple line
        this.platforms.push(
            new BasePlatform(this, 450, this.groundReferenceY - 150, 120, 40, standardProps)
        );

        // IN-WORLD TUTORIAL TEXT: Guides the player's eyes and actions perfectly.
        // Positioned directly above the first hook node (~460, 953) so the hint
        // truly points at the tappable anchor.
        this.add.text(390, this.groundReferenceY - 330, "1. Tap & HOLD here to Hook", {
            fontSize: "24px",
            fontFamily: "monospace",
            color: "#00ffcc",
            stroke: "#000000",
            strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(60);

        this.add.text(390, this.groundReferenceY - 290, "↓", {
            fontSize: "24px",
            fontFamily: "monospace",
            color: "#00ffcc",
            stroke: "#000000",
            strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(60);

        this.add.text(350, this.groundReferenceY - 50, "2. Keep holding to swing\n3. Release to LAUNCH!", {
            fontSize: "18px",
            fontFamily: "monospace",
            color: "#ffffff",
            align: "center",
            stroke: "#000000",
            strokeThickness: 3
        }).setDepth(60);

        // Spacing out the rest of the mountain to catch your launch
        this.platforms.push(
            new BasePlatform(this, 800, this.groundReferenceY - 300, 150, 30, standardProps)
        );
        this.platforms.push(
            new BasePlatform(this, 1150, this.groundReferenceY - 450, 150, 30, standardProps)
        );
        this.platforms.push(
            new BasePlatform(this, 1550, this.groundReferenceY - 650, 200, 150, standardProps)
        );

        // --- INFINITE PROCEDURAL LEVEL GENERATOR ---
        // Handcrafted intro above; from here-on the world is generated forever.
        // The generator owns `this.platforms` (shared reference) and seeds the
        // tutorial hook anchors, keeping culling and reachability in one place.
        this.levelSeed = this.generateLevelSeed();
        this.levelGenerator = new LevelGenerator(
            this,
            this.platforms,
            this.levelSeed,
            this.groundReferenceY
        );
        this.levelGenerator.seedTutorialHooks();

        // --- CAMERA SETUP ---
        // Subtle forward bias for initial tutorial climb (-45px), subpixel camera follow
        this.cameraFollowOffsetX = -45;
        this.cameras.main.startFollow(this.player, false, 0.08, 0.08);
        this.cameras.main.setFollowOffset(this.cameraFollowOffsetX, 150);

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
        }).setScrollFactor(0);

        this.runLowestY = this.groundReferenceY;
        this.currentAltitudeMeters = 0;
        this.isGameOver = false;
        this.campGraceTimer = 0;

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tetherverse:game-ready'));
        }
    }

    update(time: number, delta: number) {
        if (this.isGameOver) return;

        this.updateBackgroundMotion();

        // Smooth dynamic camera lookahead based on immediate route direction ahead of player
        if (this.levelGenerator && this.player && this.player.body) {
            const routeDir = this.levelGenerator.getRouteDirectionNear(this.player.x, this.player.y);
            // routeDir is 1 (climbing right), -1 (climbing left), or 0 (vertical / centered)
            const targetOffsetX = -routeDir * 45;

            // Delta-time based exponential smoothing for a completely continuous, butter-smooth transition
            const smoothRate = 1.8;
            const alpha = 1 - Math.exp(-smoothRate * (delta / 1000));
            this.cameraFollowOffsetX = Phaser.Math.Linear(this.cameraFollowOffsetX, targetOffsetX, alpha);
            this.cameras.main.setFollowOffset(this.cameraFollowOffsetX, 150);
        }

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

                // Live altitude drives difficulty tier selection and the rising death-zone
                this.currentAltitudeMeters = altitudeMeters;
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

            // --- FORGIVING DEATH-VOID ---
            // You only die when you are unhooked, below EVERY remaining platform, and
            // resting (slow) long enough to have no recovery path left. Hooking, moving,
            // or sitting above the lowest platform always resets the countdown, so the
            // player is never killed mid-swing or with a platform within landing reach.
            const fallSpeed = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y);
            const lowestAlive = this.levelGenerator.getLowestPlatformBelow(this.player.y);

            let belowVoidAndIdle = false;
            if (lowestAlive) {
                const voidY = lowestAlive.y + this.levelGenerator.voidMargin;
                belowVoidAndIdle =
                    !this.pivotEngine?.isCurrentlyHooked() &&
                    this.player.y > voidY &&
                    fallSpeed < GAME_CONSTANTS.LANDING.SPEED_THRESHOLD;
            }

            if (belowVoidAndIdle) {
                this.campGraceTimer += delta;
                if (this.campGraceTimer >= GAME_CONSTANTS.CHECKPOINT.CAMP_GRACE_MS) {
                    this.handlePlayerFailure();
                    return;
                }
            } else {
                this.campGraceTimer = 0;
            }

            // --- ENDLESS GENERATION & CULLING ---
            // Generate ahead of Jack and prune geometry far behind him. Generation is
            // fully validated (reachable/hookable/overlap/dead-end) and capped per frame.
            this.levelGenerator.update(this.player.x, this.player.y, this.currentAltitudeMeters);
        }
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
        if (!this.player || this.player.playerState === "AIMING" || this.player.playerState === "LAUNCHED") {
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

            const velocity = this.player.body.velocity;
            const speed = Math.hypot(velocity.x, velocity.y);

            // Landing assist: settle whenever descending onto the platform top at a
            // landable speed (LAUNCHED is excluded above, so this never interrupts a
            // real swing). Sticks the landing instead of sliding off the small ledge.
            if (withinSurfaceBand && withinHorizontalBounds && velocity.y >= 0 && speed < GAME_CONSTANTS.LANDING.SPEED_THRESHOLD) {

                // Fully stop the body so the landing holds.
                this.matter.body.setVelocity(this.player.body, { x: 0, y: 0 });
                this.matter.body.setAngularVelocity(this.player.body, 0);

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
        if (this.isGameOver) return;
        this.isGameOver = true;

        // Capture the run peak altitude (highest point reached this run) before pausing.
        const peakPixels = (this.groundReferenceY - this.runLowestY) - 20;
        const peakMeters = Math.max(0, Math.floor(peakPixels / 10));

        // 1. Capture and save the high score immediately before anything is destroyed
        if (this.maxAltitudeMeters) {
            this.saveHighScore(this.maxAltitudeMeters);
        }

        // 2. Destroy the previous engine runtime references to safely unbind old event listeners 
        // and eliminate pointer registration leaks
        if (this.pivotEngine) {
            this.pivotEngine.destroy();
        }

        // 3. Freeze the world so the scene renders a still frame behind the React overlay
        this.matter.world.pause();

        // 4. Hand control to the React layer: it renders the themed GAME OVER overlay and
        //    decides between rerunning (remount) or exiting back to the launcher.
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("tetherverse:gameover", {
                detail: {
                    altitude: peakMeters,
                    best: this.maxAltitudeMeters
                }
            }));
        }
    }
    private generateLevelSeed(): number {
        // A fresh seed every run keeps runs rerollable; the same seed always
        // reproduces the exact same level (useful for debugging and balancing).
        return (Date.now() ^ ((Math.random() * 0x100000000) >>> 0)) >>> 0;
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