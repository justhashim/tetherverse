// src/game/levels/LevelGenerator.ts

import Phaser from "phaser";
import { BasePlatform } from "../terrain/BasePlatform";
import { GAME_CONSTANTS } from "../config/game-constants";
import { COLLISION_CHANNELS } from "../config/physics-channels";
import { createSeededRng, type Rng } from "./seeded-random";

export type PatternId =
    | "STRAIGHT_ASCENT"
    | "LEFT_SWING"
    | "RIGHT_SWING"
    | "ZIGZAG"
    | "WIDE_SWING"
    | "TIGHT_PRECISION"
    | "HOOK_CHAIN"
    | "VERTICAL_SHAFT"
    | "OFFSET_LANDING"
    | "LONG_RELEASE"
    | "HIGH_RISK_SHORTCUT"
    | "RECOVERY_ROUTE";

type Beat =
    | "SAFE"
    | "CHALLENGE"
    | "RISK"
    | "RELIEF"
    | "HIGH_RISK"
    | "MAJOR_CLIMB";

export interface DifficultyProfile {
    widthMin: number;
    widthMax: number;
    heightMin: number;
    heightMax: number;
    stepMin: number;
    stepMax: number;
    idealGap: number;
    horizontalRatio: number;
    idealHorizontal: number;
    anchorLiftMin: number;
    anchorLiftMax: number;
    anchorOffsetMax: number;
    recoveryChance: number;
    riskChance: number;
    chainLength: number;
    voidMargin: number;
    patterns: readonly PatternId[];
}

interface PatternSpec {
    dirBias: number;           // -1..1 directional pull for deltaX
    spread: number;            // horizontal spread preference (not a hard bound)
    stepScale: number;         // vertical gap rhythm multiplier (normal/challenge/precision/major)
    widthScale: number;        // platform width multiplier
    vertical: boolean;         // allows near-zero horizontal travel (shafts / hook chains)
    dense: boolean;            // exempt from the platform-spam density cap (authored clusters)
    anchorLiftScale: number;
    anchorOffsetScale: number;
    risk: boolean;             // high-risk shortcut (large consequence)
    recovery: boolean;         // prefers an authored recovery rider
}

interface Candidate {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ScoredCandidate {
    candidate: Candidate;
    score: number;
}

const BEAT_SEQUENCE: Beat[] = [
    "SAFE",
    "CHALLENGE",
    "RISK",
    "RELIEF",
    "CHALLENGE",
    "HIGH_RISK",
    "MAJOR_CLIMB",
    "RELIEF",
];

const FALLBACK_SPEC: PatternSpec = {
    dirBias: 0,
    spread: 0.5,
    stepScale: 1.0,
    widthScale: 1.0,
    vertical: false,
    dense: false,
    anchorLiftScale: 0.9,
    anchorOffsetScale: 0.4,
    risk: false,
    recovery: false,
};

const TUTORIAL_HOOKS: ReadonlyArray<{
    platformX: number;
    yOffset: number;
    horizontalOffset: number;
    ropeLength: number;
}> = [
    { platformX: 250, yOffset: 20, horizontalOffset: 140, ropeLength: 300 },
    { platformX: 450, yOffset: -150, horizontalOffset: 280, ropeLength: 410 },
    { platformX: 800, yOffset: -300, horizontalOffset: 300, ropeLength: 440 },
    { platformX: 1150, yOffset: -450, horizontalOffset: 320, ropeLength: 470 },
    { platformX: 1550, yOffset: -650, horizontalOffset: 340, ropeLength: 500 },
];

export class LevelGenerator {
    private readonly scene: Phaser.Scene;
    private readonly platforms: BasePlatform[];
    private readonly hookNodes: Phaser.Physics.Matter.Image[] = [];
    private readonly rng: Rng;
    private readonly maxReach: number;
    private readonly ropeLength: number;

    private headX: number;
    private headY: number;
    private readonly groundReferenceY: number;
    private prevHeight: number = 150; // handoff ledge (1550, ground-650) is 200 wide x 150 tall
    private committedCount: number = 0;
    private zigzagDir: number = 1;
    private lastPattern: PatternId | null = null;
    private lastDirection: number = 0; // last committed horizontal travel direction (+1 / -1 / 0 straight up)
    private currentProfile: DifficultyProfile;

    constructor(
        scene: Phaser.Scene,
        platforms: BasePlatform[],
        seed: number,
        groundReferenceY: number
    ) {
        this.scene = scene;
        this.platforms = platforms;
        this.rng = createSeededRng(seed);
        this.maxReach = GAME_CONSTANTS.PROCEDURAL.PLATFORM_REACH;
        this.ropeLength = GAME_CONSTANTS.PROCEDURAL.ROPE_LENGTH;
        this.headX = 1550;
        this.headY = groundReferenceY - 650;
        this.groundReferenceY = groundReferenceY;
        this.currentProfile = this.getProfile(0);
    }

    public get headYValue(): number {
        return this.headY;
    }

    public get voidMargin(): number {
        return this.currentProfile.voidMargin;
    }

    public get platformCount(): number {
        return this.platforms.length;
    }

    // --- Public update: keep a distance-based lookahead ahead, then cull behind. ---
    public update(playerX: number, playerY: number, altitudeMeters: number): void {
        this.currentProfile = this.getProfile(altitudeMeters);

        const proc = GAME_CONSTANTS.PROCEDURAL;
        // Distance-based lookahead, NOT a fixed platform count. TARGET_SPACING only
        // tells us roughly how many meaningful hops that distance should contain
        // (ceil(GENERATION_AHEAD / TARGET_SPACING) ~ 8); each hop is a real challenge.
        const ahead = Math.max(proc.GENERATION_AHEAD, proc.MIN_FUTURE_PLATFORMS * proc.TARGET_SPACING);
        const maxPerFrame = proc.MAX_GENERATED_PER_FRAME;

        let generated = 0;
        while ((playerY - ahead) < this.headY) {
            if (generated >= maxPerFrame) break;
            this.generateOne(playerX);
            generated++;
        }

        this.cull(playerY);
    }

    // --- Death-void support: lowest active platform below a Y coordinate. ---
    public getLowestPlatformBelow(y: number): BasePlatform | null {
        let lowest: BasePlatform | null = null;
        for (const p of this.platforms) {
            if (!p || !p.active || !p.body) continue;
            if (p.y > y && (!lowest || p.y > lowest.y)) {
                lowest = p;
            }
        }
        return lowest;
    }

    // --- Tutorial hook layout (preserved from the original game). ---
    public seedTutorialHooks(): void {
        for (const node of this.hookNodes) {
            node.destroy();
        }
        this.hookNodes.length = 0;

        for (const hook of TUTORIAL_HOOKS) {
            this.spawnTopRightHookAnchor(
                hook.platformX,
                this.groundReferenceY + hook.yOffset,
                hook.horizontalOffset,
                hook.ropeLength
            );
        }
    }

    // =====================================================================
    //  Generation - one meaningful platform at a time; best-scoring wins
    // =====================================================================

    private generateOne(playerX: number): void {
        const profile = this.currentProfile;
        const proc = GAME_CONSTANTS.PROCEDURAL;

        const beat = this.currentBeat(profile);
        const pattern = this.pickPattern(beat, profile);
        const spec = this.getPatternSpec(pattern);

        const prevX = this.headX;
        const prevY = this.headY;

        // Sample a batch of candidates per attempt and keep the best-scoring one.
        // Reaching for ideal spacing/lateral keeps the level spacious and rhythmic
        // instead of grabbing the first reachable location.
        let best: ScoredCandidate | null = null;
        for (let attempt = 0; attempt < proc.MAX_CANDIDATE_ATTEMPTS && !best; attempt++) {
            for (let i = 0; i < proc.CANDIDATE_COUNT; i++) {
                const candidate = this.sampleCandidate(profile, spec, prevX, prevY, playerX);
                if (!candidate) continue;

                if (!this.validateCandidate(candidate, prevX, prevY, playerX, profile, spec)) {
                    continue;
                }

                const score = this.scoreCandidate(candidate, prevX, prevY, profile);
                if (!best || score > best.score) {
                    best = { candidate, score };
                }
            }
        }

        if (best) {
            this.commitPlatform(best.candidate, prevX, prevY, profile, spec);
            this.maybeSpawnRecoveryRider(best.candidate.x, best.candidate.y, playerX, profile, spec);
            return;
        }

        this.spawnFallback(prevX, prevY, playerX, profile);
    }

    private currentBeat(profile: DifficultyProfile): Beat {
        if (profile.chainLength <= 0) return "CHALLENGE";
        const idx = Math.floor(this.committedCount / profile.chainLength) % BEAT_SEQUENCE.length;
        if (BEAT_SEQUENCE[idx] === "HIGH_RISK" && this.rng() >= profile.riskChance) {
            return "RISK";
        }
        return BEAT_SEQUENCE[idx];
    }

    private pickPattern(beat: Beat, profile: DifficultyProfile): PatternId {
        const allowed = new Set<PatternId>(profile.patterns);
        const pool = this.getBeatPool(beat).filter(p => allowed.has(p));

        if (pool.length === 0) {
            const basePool = profile.patterns;
            return basePool[Math.floor(this.rng() * basePool.length)];
        }

        let pick = pool[Math.floor(this.rng() * pool.length)];
        if (pick === this.lastPattern && pool.length > 1) {
            pick = pool[Math.floor(this.rng() * pool.length)];
        }
        this.lastPattern = pick;
        return pick;
    }

    private getBeatPool(beat: Beat): PatternId[] {
        switch (beat) {
            case "SAFE":
                return ["STRAIGHT_ASCENT", "LEFT_SWING", "RIGHT_SWING"];
            case "CHALLENGE":
                return ["ZIGZAG", "OFFSET_LANDING", "WIDE_SWING"];
            case "RISK":
                return ["TIGHT_PRECISION", "WIDE_SWING", "LONG_RELEASE", "HOOK_CHAIN"];
            case "RELIEF":
                return ["STRAIGHT_ASCENT", "HOOK_CHAIN", "STRAIGHT_ASCENT"];
            case "HIGH_RISK":
                return ["HIGH_RISK_SHORTCUT", "TIGHT_PRECISION", "OFFSET_LANDING"];
            case "MAJOR_CLIMB":
                return ["VERTICAL_SHAFT", "HOOK_CHAIN", "VERTICAL_SHAFT"];
        }
    }

    // =====================================================================
    //  Spatial sampling - rhythm gap first, horizontal from remaining reach
    // =====================================================================

    private sampleCandidate(
        profile: DifficultyProfile,
        spec: PatternSpec,
        prevX: number,
        prevY: number,
        playerX: number
    ): Candidate | null {
        const proc = GAME_CONSTANTS.PROCEDURAL;

        // --- 1. Choose a meaningful vertical gap (rhythm beats modulate the tier band). ---
        const maxGap = Math.min(proc.MAX_VERTICAL_GAP, profile.stepMax * spec.stepScale);
        // stepScale can push a beat's floor above the absolute ceiling (e.g. HIGH_RISK at
        // 1.35x), so clamp minGap DOWN to maxGap rather than producing an empty band.
        const minGap = Math.min(maxGap, Math.max(proc.MIN_VERTICAL_GAP, profile.stepMin * spec.stepScale));
        const stepUp = this.between(minGap, maxGap);

        // --- 2. Horizontal range derived from the reach that remains after the gap. ---
        const maxHorizontalReach = Math.floor(Math.sqrt(Math.max(
            0,
            this.maxReach * this.maxReach - stepUp * stepUp
        )));
        const usableMaxH = Math.min(proc.MAX_HORIZONTAL_GAP, maxHorizontalReach);
        const minH = spec.vertical ? 0 : Math.min(proc.MIN_HORIZONTAL_GAP, usableMaxH);
        if (usableMaxH < minH) return null;

        // Preferring the pattern's lateral character around the tier's ideal horizontal.
        const idealTarget = Math.min(usableMaxH, Math.max(minH, profile.idealHorizontal * spec.spread));
        const low = Math.max(minH, idealTarget - this.maxReach * 0.12);
        const high = Math.min(usableMaxH, Math.max(idealTarget + this.maxReach * 0.12, low + 20));
        if (high < low) return null;
        const lateralMag = this.between(low, Math.min(high, usableMaxH));

        // --- 3. Direction: converge on a strayed Jack, otherwise pattern character. ---
        const playerDrift = Math.abs(playerX - prevX);
        let direction: number;
        if (playerDrift > 200) {
            direction = playerX >= prevX ? 1 : -1;
        } else if (Math.abs(spec.dirBias) < 0.01) {
            direction = this.rng() < 0.5 ? -1 : 1;
        } else {
            direction = spec.dirBias >= 0 ? 1 : -1;
        }

        const width = Math.max(40, Math.round(this.between(profile.widthMin, profile.widthMax) * spec.widthScale));
        const height = Math.round(this.between(profile.heightMin, profile.heightMax));

        return { x: prevX + direction * lateralMag, y: prevY - stepUp, width, height };
    }

    private scoreCandidate(
        candidate: Candidate,
        prevX: number,
        prevY: number,
        profile: DifficultyProfile
    ): number {
        const deltaY = prevY - candidate.y;
        const deltaX = Math.abs(candidate.x - prevX);
        const direction = candidate.x === prevX ? 0 : (candidate.x > prevX ? 1 : -1);

        // Spacing: prefer platforms near the tier's ideal vertical gap, not min or max.
        const spacingError = Math.abs(deltaY - profile.idealGap);
        const spacingScore = Math.max(0, 100 - spacingError);

        // Horizontal movement: meaningful sideways travel around the ideal lateral.
        const horizontalError = Math.abs(deltaX - Math.min(profile.idealHorizontal, this.maxReach * 0.8));
        const horizontalScore = Math.max(0, 80 - horizontalError);

        // Direction variation: reward switching directions to avoid one-way drift.
        const directionBonus = this.lastDirection !== 0 && direction !== 0 && direction !== this.lastDirection ? 35 : 0;

        // Landing quality: prefer widths near the tier's median (neither too thin nor bloated).
        const medianWidth = (profile.widthMin + profile.widthMax) / 2;
        const landingScore = Math.max(0, 25 - Math.abs(candidate.width - medianWidth));

        // Clutter penalty: count nearby platforms competing for the same space
        // (excludes the launch origin - that one is the mandatory chain).
        const clutterPenalty = this.countClutterAround(candidate, prevX, prevY) * 12;

        return spacingScore + horizontalScore + directionBonus + landingScore - clutterPenalty;
    }

    // =====================================================================
    //  Validation gates
    // =====================================================================

    private validateCandidate(
        candidate: Candidate,
        prevX: number,
        prevY: number,
        playerX: number,
        profile: DifficultyProfile,
        spec: PatternSpec
    ): boolean {
        // 1. Reachable - absolute hard ceiling, never a target.
        if (Math.hypot(candidate.x - prevX, candidate.y - prevY) > this.maxReach + 1) {
            return false;
        }

        // 2. Inside the dynamic generation corridor (world stays limitless).
        if (!this.isInCorridor(candidate.x, playerX, prevX)) {
            return false;
        }

        // 3. No overlap / stacking with existing terrain, and no vertical stack
        //    directly above the launch origin.
        if (this.overlapsExisting(candidate.x, candidate.y, candidate.width, candidate.height)) {
            return false;
        }

        // 4. Visual/gameplay clearance: keep meaningful empty space around targets
        //    (excludes the platform Jack is launching from, which is by definition
        //    close and below - otherwise wide ledges would block every reachable hop).
        if (!this.passesClearance(candidate, prevX, prevY)) {
            return false;
        }

        // 5. Density: no more than MAX_PLATFORMS_PER_WINDOW OTHER platforms in the
        //    local vertical window (the launch origin is exempt - it is the mandatory
        //    chain, and rhythm spacing naturally keeps ~3 route platforms in 500px).
        if (!spec.dense && !this.passesDensity(candidate, prevX, prevY)) {
            return false;
        }

        // 6. Hookable - an anchor that fits the tether's rope and a useful swing arc.
        const anchor = this.computeAnchor(
            prevX,
            prevY,
            this.prevHeight,
            candidate.x,
            candidate.y,
            profile,
            spec
        );
        if (!anchor) {
            return false;
        }

        // 7. Future route must remain possible - never end in a dead end.
        if (!this.isFuturePossible(candidate.x, candidate.y, playerX, profile)) {
            return false;
        }

        return true;
    }

    private isInCorridor(candidateX: number, playerX: number, headX: number): boolean {
        const half = GAME_CONSTANTS.PROCEDURAL.GENERATION_WIDTH / 2;
        const distFromPlayer = Math.abs(candidateX - playerX);

        if (distFromPlayer <= half) {
            return true;
        }

        // Convergence rule: when Jack strays outside the window, geometry that moves
        // the route CLOSER to him than the current head is permitted, so the level
        // can always follow him left/right without ever locking him out.
        return distFromPlayer < Math.abs(headX - playerX);
    }

    private overlapsExisting(
        x: number,
        y: number,
        widthParam: number,
        heightParam: number
    ): boolean {
        const candidateVisualW = widthParam * 2;
        const candidateVisualH = heightParam * 2;

        for (const p of this.platforms) {
            if (!p || !p.active || !p.body) continue;
            const dx = Math.abs(p.x - x);
            const dy = Math.abs(p.y - y);
            if (dx > 700 || dy > 700) continue;

            const horizontalOverlap = dx < (p.displayWidth + candidateVisualW) / 2 + 25;
            const verticalOverlap = dy < (p.displayHeight + candidateVisualH) / 2 + 25;
            if (horizontalOverlap && verticalOverlap) {
                return true;
            }
        }
        return false;
    }

    // Design clearance: keep visual and gameplay separation so a candidate never
    // crowds a nearby (non-origin) target. Uses a larger pad than the collision test.
    private passesClearance(candidate: Candidate, prevX: number, prevY: number): boolean {
        const proc = GAME_CONSTANTS.PROCEDURAL;
        const candidateVisualW = candidate.width * 2;

        for (const p of this.platforms) {
            if (!p || !p.active || !p.body) continue;

            // The launch origin is exempt: it IS the platform being left behind.
            if (p.x === prevX && p.y === prevY) continue;

            const dx = Math.abs(p.x - candidate.x);
            const dy = Math.abs(p.y - candidate.y);
            if (dx > proc.LOCAL_CHECK_RADIUS || dy > proc.LOCAL_CHECK_RADIUS) continue;

            const requiredClearance =
                p.displayWidth / 2 + candidateVisualW / 2 + proc.CLEARANCE_PAD;
            const centerDistance = Math.hypot(dx, dy);
            if (centerDistance < requiredClearance) {
                return false;
            }
        }
        return true;
    }

    private passesDensity(candidate: Candidate, prevX: number, prevY: number): boolean {
        const proc = GAME_CONSTANTS.PROCEDURAL;
        // The launch origin is exempt: it is the platform being left behind and is
        // always inside the window by construction (the candidate is reachable from it).
        let count = 0;
        for (const p of this.platforms) {
            if (!p || !p.active || !p.body) continue;
            if (Math.abs(p.x - prevX) < 1 && Math.abs(p.y - prevY) < 1) continue;
            const dy = Math.abs(p.y - candidate.y);
            if (dy > proc.DENSITY_WINDOW) continue;
            const dx = Math.abs(p.x - candidate.x);
            if (dx > proc.DENSITY_HBOX) continue;
            count++;
            if (count >= proc.MAX_PLATFORMS_PER_WINDOW) {
                return false;
            }
        }
        return true;
    }

    private countClutterAround(candidate: Candidate, prevX: number, prevY: number): number {
        const proc = GAME_CONSTANTS.PROCEDURAL;
        let count = 0;
        for (const p of this.platforms) {
            if (!p || !p.active || !p.body) continue;
            if (Math.abs(p.x - prevX) < 1 && Math.abs(p.y - prevY) < 1) continue;
            const dy = Math.abs(p.y - candidate.y);
            const dx = Math.abs(p.x - candidate.x);
            if (dy <= proc.DENSITY_WINDOW * 0.6 && dx <= proc.DENSITY_HBOX * 0.6) {
                count++;
            }
        }
        return count;
    }

    private computeAnchor(
        prevX: number,
        prevY: number,
        prevHeight: number,
        nextX: number,
        nextY: number,
        profile: DifficultyProfile,
        spec: PatternSpec
    ): { x: number; y: number } | null {
        const offsetMax = profile.anchorOffsetMax * spec.anchorOffsetScale;
        const midX = (prevX + nextX) / 2 + this.between(-offsetMax, offsetMax);
        const baseY = (prevY + nextY) / 2;
        const lift = this.between(
            profile.anchorLiftMin * spec.anchorLiftScale,
            profile.anchorLiftMax * spec.anchorLiftScale
        );
        let anchorY = baseY - lift;

        // Clamp the anchor so it stays within the tether rope of the player's
        // standing point on the previous platform (PivotEngine uses jackLength 340).
        const standX = prevX;
        const standY = prevY - prevHeight - GAME_CONSTANTS.PLAYER.RADIUS;
        const dxFromStand = Math.abs(midX - standX);
        const maxDy = Math.sqrt(Math.max(0, this.ropeLength * this.ropeLength - dxFromStand * dxFromStand));
        const minAnchorY = standY - maxDy;
        anchorY = Math.max(anchorY, minAnchorY);

        if (anchorY >= baseY - 10) {
            return null;
        }
        const distFromStand = Math.hypot(midX - standX, anchorY - standY);
        if (distFromStand > this.ropeLength + 1) {
            return null;
        }

        // The anchor must sit measurably above the target platform so the release
        // point of the swing is below the anchor (a real pendulum arc, not a stall).
        if (anchorY > nextY - 70) {
            return null;
        }

        return { x: midX, y: anchorY };
    }

    // Future spacing must remain geometrically possible from this candidate, using
    // the same meaningful-gap rhythm (NOT the raw 280 - which is only a ceiling).
    private isFuturePossible(
        x: number,
        y: number,
        playerX: number,
        profile: DifficultyProfile
    ): boolean {
        const proc = GAME_CONSTANTS.PROCEDURAL;
        for (let i = 0; i < 8; i++) {
            const stepUp = this.between(
                Math.max(proc.MIN_VERTICAL_GAP, profile.stepMin),
                Math.min(proc.MAX_VERTICAL_GAP, profile.stepMax)
            );
            const lateral = Math.floor(Math.sqrt(Math.max(
                0,
                this.maxReach * this.maxReach - stepUp * stepUp
            )));
            const maxDx = Math.min(proc.MAX_HORIZONTAL_GAP, lateral);
            const minDx = Math.min(proc.MIN_HORIZONTAL_GAP, maxDx);
            if (maxDx < minDx) continue;

            const nx = x + (this.rng() * 2 - 1) * this.between(minDx, maxDx);
            const ny = y - stepUp;

            if (!this.isInCorridor(nx, playerX, x)) continue;
            if (this.overlapsExisting(nx, ny, profile.widthMin, profile.heightMin)) continue;
            return true;
        }
        return false;
    }

    // =====================================================================
    //  Commit
    // =====================================================================

    private commitPlatform(
        candidate: Candidate,
        prevX: number,
        prevY: number,
        profile: DifficultyProfile,
        spec: PatternSpec
    ): void {
        const platform = new BasePlatform(
            this.scene,
            candidate.x,
            candidate.y,
            candidate.width,
            candidate.height,
            { friction: 0.9, restitution: 0.05 }
        );
        this.platforms.push(platform);

        const anchor = this.computeAnchor(
            prevX,
            prevY,
            this.prevHeight,
            candidate.x,
            candidate.y,
            profile,
            spec
        );
        if (anchor) {
            this.spawnHookAnchor(anchor.x, anchor.y);
        } else {
            // Safety net: a vertical hook above the previous standing point is always
            // within the tether rope, so the route can never strand Jack without an
            // upgradable hook.
            const standY = prevY - this.prevHeight - GAME_CONSTANTS.PLAYER.RADIUS;
            this.spawnHookAnchor(prevX, standY - 200);
        }

        this.headX = candidate.x;
        this.headY = candidate.y;
        this.prevHeight = candidate.height;
        this.lastDirection = candidate.x === prevX ? 0 : (candidate.x > prevX ? 1 : -1);
        this.committedCount += 1;
    }

    // Authored recovery riders: a lower platform that already exists as part of the
    // route (never spawned in reaction to Jack falling), giving skilled players a
    // way to save a mistake.
    private maybeSpawnRecoveryRider(
        x: number,
        y: number,
        playerX: number,
        profile: DifficultyProfile,
        spec: PatternSpec
    ): void {
        // High-risk shortcuts keep their consequence - no safety net below them.
        if (spec.risk) return;
        if (!(this.rng() < profile.recoveryChance)) return;

        for (let i = 0; i < 8; i++) {
            const rx = x + this.between(-170, 170);
            const ry = y + this.between(240, 380);

            if (!this.isInCorridor(rx, playerX, x)) continue;
            if (this.overlapsExisting(rx, ry, 80, 40)) continue;
            if (!this.passesClearance({ x: rx, y: ry, width: 80, height: 40 }, x, y)) continue;

            const rider = new BasePlatform(
                this.scene,
                rx,
                ry,
                Math.max(profile.widthMin, 90),
                40,
                { friction: 0.9, restitution: 0.05 }
            );
            this.platforms.push(rider);

            // A hook right above the rider so Jack can climb back onto the route.
            this.spawnHookAnchor(rx, ry - this.between(170, 230));
            return;
        }
    }

    // Guaranteed forward progress without a platform freeze. Every fallback candidate
    // still respects reachability (distance <= maxReach) and collision - bigger steps
    // are tried first so the route can clear any tall pre-existing geometry.
    private spawnFallback(
        prevX: number,
        prevY: number,
        playerX: number,
        profile: DifficultyProfile
    ): void {
        const proc = GAME_CONSTANTS.PROCEDURAL;
        // Step options descending: bigger vertical gains first.
        const stepOptions = [
            Math.min(proc.MAX_VERTICAL_GAP, this.maxReach),
            230, 210, 190, 170, 150,
            Math.max(proc.MIN_VERTICAL_GAP, 130),
        ];

        for (const stepUp of stepOptions) {
            const maxOffset = Math.floor(Math.sqrt(Math.max(
                0,
                this.maxReach * this.maxReach - stepUp * stepUp
            )));
            const y = prevY - stepUp;

            const offsets = Array.from(new Set(
                [0, 110, -110, maxOffset, -maxOffset, 60, -60]
                    .filter(o => Math.abs(o) <= maxOffset)
            ));

            const width = Math.max(profile.widthMin, 90);
            for (const off of offsets) {
                const x = prevX + off;
                if (!this.isInCorridor(x, playerX, prevX)) continue;
                if (this.overlapsExisting(x, y, width, 40)) continue;
                this.commitPlatform(
                    { x, y, width, height: 40 },
                    prevX,
                    prevY,
                    profile,
                    FALLBACK_SPEC
                );
                return;
            }
        }

        // Absolute anti-freeze guard: place something upward now. The lateral offset
        // is reach-bounded (hypot(lateral, 180) <= maxReach) so this final path can
        // never produce an impossible hop, and it prefers the direction of Jack so
        // the route keeps converging even after a worst-case fallback.
        const width = Math.max(profile.widthMin, 90);
        const y = prevY - Math.max(proc.MIN_VERTICAL_GAP, 160);
        const lateralGuard = Math.floor(Math.sqrt(Math.max(
            0,
            this.maxReach * this.maxReach - (prevY - y) * (prevY - y)
        )));
        const towardPlayer = playerX >= prevX ? 1 : -1;
        const guardOffsets = Array.from(new Set([0, towardPlayer * lateralGuard, -towardPlayer * lateralGuard]));
        for (const off of guardOffsets) {
            const x = prevX + off;
            if (!this.isInCorridor(x, playerX, prevX)) continue;
            if (this.overlapsExisting(x, y, width, 40)) continue;
            this.commitPlatform(
                { x, y, width, height: 40 },
                prevX,
                prevY,
                profile,
                FALLBACK_SPEC
            );
            return;
        }
        this.commitPlatform(
            { x: prevX, y, width, height: 40 },
            prevX,
            prevY,
            profile,
            FALLBACK_SPEC
        );
    }

    // =====================================================================
    //  Culling - remove only geometry far below the player that is no longer
    //  realistically reachable. Future route and current platform are kept.
    // =====================================================================

    private cull(playerY: number): void {
        const cullDist = GAME_CONSTANTS.PROCEDURAL.CULL_DISTANCE;

        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const p = this.platforms[i];
            if (!p || !p.body) {
                this.platforms.splice(i, 1);
                continue;
            }

            // Cull strictly by depth, so recovery paths stay alive and memory is bounded.
            if (p.y - playerY > cullDist) {
                p.destroy();
                this.platforms.splice(i, 1);
            }
        }

        for (let i = this.hookNodes.length - 1; i >= 0; i--) {
            const node = this.hookNodes[i];
            if (!node || !node.body) {
                this.hookNodes.splice(i, 1);
                continue;
            }
            if (node.body.position.y - playerY > cullDist + 500) {
                node.destroy();
                this.hookNodes.splice(i, 1);
            }
        }
    }

    // =====================================================================
    //  Difficulty selection
    // =====================================================================

    private getProfile(altitudeMeters: number): DifficultyProfile {
        const d = GAME_CONSTANTS.DIFFICULTY;
        const a = GAME_CONSTANTS.ALTITUDE;
        if (altitudeMeters < a.INTERMEDIATE_ZONE) return d.TUTORIAL as DifficultyProfile;
        if (altitudeMeters < a.HARD_ZONE) return d.INTERMEDIATE as DifficultyProfile;
        if (altitudeMeters < a.EXPERT_ZONE) return d.HARD as DifficultyProfile;
        if (altitudeMeters < a.ENDLESS_ZONE) return d.EXPERT as DifficultyProfile;
        return d.ENDLESS as DifficultyProfile;
    }

    // =====================================================================
    //  Pattern table - each pattern encodes a gameplay rhythm
    // =====================================================================

    private getPatternSpec(id: PatternId): PatternSpec {
        const flip = () => (this.rng() < 0.5 ? -1 : 1);
        switch (id) {
            case "STRAIGHT_ASCENT":
                return { dirBias: 0, spread: 0.5, stepScale: 1.0, widthScale: 1.1, vertical: false, dense: false, anchorLiftScale: 0.9, anchorOffsetScale: 0.3, risk: false, recovery: false };
            case "LEFT_SWING":
                return { dirBias: -0.75, spread: 0.9, stepScale: 1.0, widthScale: 1.0, vertical: false, dense: false, anchorLiftScale: 1.1, anchorOffsetScale: 0.8, risk: false, recovery: false };
            case "RIGHT_SWING":
                return { dirBias: 0.75, spread: 0.9, stepScale: 1.0, widthScale: 1.0, vertical: false, dense: false, anchorLiftScale: 1.1, anchorOffsetScale: 0.8, risk: false, recovery: false };
            case "ZIGZAG":
                return { dirBias: 0, spread: 0.8, stepScale: 1.05, widthScale: 0.9, vertical: false, dense: false, anchorLiftScale: 1.1, anchorOffsetScale: 0.7, risk: false, recovery: false };
            case "WIDE_SWING":
                return { dirBias: flip() * 0.9, spread: 1.2, stepScale: 1.1, widthScale: 0.9, vertical: false, dense: false, anchorLiftScale: 1.3, anchorOffsetScale: 1.1, risk: false, recovery: false };
            case "TIGHT_PRECISION":
                return { dirBias: flip() * 0.6, spread: 0.55, stepScale: 0.85, widthScale: 0.6, vertical: false, dense: false, anchorLiftScale: 1.2, anchorOffsetScale: 1.0, risk: false, recovery: false };
            case "HOOK_CHAIN":
                return { dirBias: 0, spread: 0.4, stepScale: 0.9, widthScale: 0.8, vertical: true, dense: true, anchorLiftScale: 1.05, anchorOffsetScale: 0.35, risk: false, recovery: false };
            case "VERTICAL_SHAFT":
                return { dirBias: 0, spread: 0.3, stepScale: 1.2, widthScale: 0.85, vertical: true, dense: true, anchorLiftScale: 1.3, anchorOffsetScale: 0.2, risk: false, recovery: false };
            case "OFFSET_LANDING":
                return { dirBias: flip() * 0.95, spread: 0.95, stepScale: 1.0, widthScale: 0.9, vertical: false, dense: false, anchorLiftScale: 0.95, anchorOffsetScale: 1.35, risk: false, recovery: false };
            case "LONG_RELEASE":
                return { dirBias: flip() * 0.7, spread: 1.3, stepScale: 1.15, widthScale: 0.9, vertical: false, dense: false, anchorLiftScale: 1.4, anchorOffsetScale: 1.2, risk: false, recovery: false };
            case "HIGH_RISK_SHORTCUT":
                return { dirBias: flip() * 0.85, spread: 1.1, stepScale: 1.35, widthScale: 0.6, vertical: false, dense: false, anchorLiftScale: 1.3, anchorOffsetScale: 1.35, risk: true, recovery: false };
            case "RECOVERY_ROUTE":
                return { dirBias: flip() * 0.4, spread: 0.6, stepScale: 0.9, widthScale: 1.0, vertical: false, dense: false, anchorLiftScale: 0.9, anchorOffsetScale: 0.5, risk: false, recovery: true };
        }
    }

    // =====================================================================
    //  Hook node spawning
    // =====================================================================

    private spawnTopRightHookAnchor(
        platformX: number,
        platformY: number,
        horizontalOffset: number,
        ropeLength: number
    ): void {
        const verticalOffset = Math.sqrt(Math.max(
            0,
            (ropeLength * ropeLength) - (horizontalOffset * horizontalOffset)
        ));
        this.spawnHookAnchor(platformX + horizontalOffset, platformY - verticalOffset);
    }

    private spawnHookAnchor(x: number, y: number): void {
        const node = this.scene.matter.add.image(x, y, 'hook_node', undefined, {
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

    private between(min: number, max: number): number {
        return min + this.rng() * (max - min);
    }
}
