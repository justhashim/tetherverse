export const GAME_CONSTANTS = {
    PLAYER: {
        RADIUS: 24,
        DENSITY: 0.004, // Matter.js automatically calculates mass based on area * density
        FRICTION: 0.1,
        FRICTION_STATIC: 0.5,
        FRICTION_AIR: 0.02,
        BOUNCE: 0,      // Restitution (0 so Jack settles without bouncing off surfaces)
    },
    LAUNCH: {
        MIN_DRAG_DISTANCE: 15,   // Pixels required to initiate an intentional launch drag
        MAX_DRAG_DISTANCE: 200,   // Distance cap where launch velocity maxes out
        MIN_VELOCITY: 2,          // Minimum safe escape velocity threshold
        MAX_VELOCITY: 28,         // Hard physics velocity cap for launch force
        SMOOTHING_FACTOR: 0.15,   // Input interpolation modifier
        MAX_LAUNCH_SPEED: 16,     // Cap applied to released launch velocity (controlled, prevents overshooting)
    },
    SWING: {
        CONSTRAINT_STIFFNESS: 0.08,      // Tether spring stiffness (lower = softer pull)
        DRIVE_FORCE: 0.035,              // Controlled swing acceleration pump (smooth, not overpowered)
        MAX_SWING_SPEED: 14,             // Speed ceiling while hooked to keep swings manageable
        FRICTION_AIR: 0.025,             // Air drag while hooked/swinging (balanced momentum)
        FALLING_FRICTION_AIR: 0.03,      // Air drag during free-fall/launch (predictable arcs)
        LAUNCH_BOOST: 1.08,              // Gentle velocity multiplier on release
    },
    LANDING: {
        SPEED_THRESHOLD: 18,             // Max total speed allowed for a settle-to-IDLE landing
    },
    CHECKPOINT: {
        RESPAWN_FALL_DISTANCE: 300,      // If unhooked and this far below the last safe spot, respawn there
        CAMP_GRACE_MS: 1500,             // Sustained slow rest below the death-void before game over
    },
    PROCEDURAL: {
        ROPE_LENGTH: 380,               // Max tether reach (matches PivotEngine.jackLength)
        PLATFORM_REACH: 360,            // Reachable center-to-center distance band
        GENERATION_AHEAD: 1800,         // Distance-based lookahead kept above the player
        TARGET_SPACING: 200,            // Desired spacing between platforms
        MIN_FUTURE_PLATFORMS: 6,        // Minimum future platforms kept alive ahead
        GENERATION_WIDTH: 3000,         // Dynamic generation corridor width
        MIN_VERTICAL_GAP: 120,          // Minimum vertical separation between route platforms
        MAX_VERTICAL_GAP: 270,          // Maximum vertical separation
        MIN_HORIZONTAL_GAP: 80,         // Minimum sideways travel per platform (allows tighter vertical ascents)
        MAX_HORIZONTAL_GAP: 320,        // Maximum sideways travel per platform
        CORRIDOR_MIN_X: 450,            // Mountain left boundary for switchbacks
        CORRIDOR_MAX_X: 2750,           // Mountain right boundary for switchbacks
        CANDIDATE_COUNT: 12,            // Candidates sampled per placement
        MAX_CANDIDATE_ATTEMPTS: 5,      // Retry rounds before fallback
        MAX_GENERATED_PER_FRAME: 4,     // Work cap per frame
        LOCAL_CHECK_RADIUS: 500,        // Nearby-platform scan radius for clearance/density checks
        CLEARANCE_PAD: 60,              // Visual separation beyond physical collision clearance
        DENSITY_WINDOW: 500,            // Vertical window for the platform-spam safety cap
        DENSITY_HBOX: 350,              // Horizontal band for the platform-spam safety cap
        MAX_PLATFORMS_PER_WINDOW: 4,    // Max platform count inside the density window
        CULL_DISTANCE: 3000,            // Destroy platforms/hooks this far below the player
    },
    ALTITUDE: {
        INTERMEDIATE_ZONE: 120,         // Altitude (m) where the Intermediate tier begins (early variety)
        HARD_ZONE: 350,                 // Altitude (m) where the Hard tier begins
        EXPERT_ZONE: 700,               // Altitude (m) where the Expert tier begins
        ENDLESS_ZONE: 1500,             // Altitude (m) where the Endless Mastery tier begins
    },
    DIFFICULTY: {
        // Width ranges are the BasePlatform width parameter (~visual width / 2).
        // Every band is hard-capped by PROCEDURAL.PLATFORM_REACH so a tier can never
        // generate a physically impossible platform.
        TUTORIAL: {
            widthMin: 75, widthMax: 95,             // visual ~150-190 (tightened from 260)
            heightMin: 30, heightMax: 48,           // tall, forgiving landings
            stepMin: 140, stepMax: 185,             // meaningful rhythm climb
            idealGap: 155,                          // spacing score target
            horizontalRatio: 0.50,                  // fraction of reach usable sideways
            idealHorizontal: 120,                   // horizontal score target
            anchorLiftMin: 140, anchorLiftMax: 200,
            anchorOffsetMax: 40,
            recoveryChance: 0.30,                   // authored recovery riders
            riskChance: 0,                          // no high-risk shortcuts yet
            chainLength: 4,                         // platforms per adrenaline beat
            voidMargin: 300,                        // forgiving death-void
            patterns: [
                'STRAIGHT_ASCENT',
                'LEFT_SWING',
                'RIGHT_SWING',
                'ZIGZAG',
                'SWITCHBACK',
            ] as const,
        },
        INTERMEDIATE: {
            widthMin: 50, widthMax: 75,             // visual ~100-150
            heightMin: 28, heightMax: 44,
            stepMin: 155, stepMax: 205,
            idealGap: 175,
            horizontalRatio: 0.70,
            idealHorizontal: 140,
            anchorLiftMin: 170, anchorLiftMax: 250,
            anchorOffsetMax: 80,
            recoveryChance: 0.20,
            riskChance: 0.10,
            chainLength: 5,
            voidMargin: 240,
            patterns: [
                'STRAIGHT_ASCENT',
                'LEFT_SWING',
                'RIGHT_SWING',
                'ZIGZAG',
                'WIDE_SWING',
                'HOOK_CHAIN',
                'OFFSET_LANDING',
                'SWITCHBACK',
                'VERTICAL_SHAFT',
            ] as const,
        },
        HARD: {
            widthMin: 40, widthMax: 60,             // visual ~80-120
            heightMin: 26, heightMax: 42,
            stepMin: 170, stepMax: 225,
            idealGap: 190,
            horizontalRatio: 0.82,
            idealHorizontal: 155,
            anchorLiftMin: 200, anchorLiftMax: 300,
            anchorOffsetMax: 120,
            recoveryChance: 0.14,
            riskChance: 0.18,
            chainLength: 5,
            voidMargin: 200,
            patterns: [
                'STRAIGHT_ASCENT',
                'ZIGZAG',
                'WIDE_SWING',
                'TIGHT_PRECISION',
                'HOOK_CHAIN',
                'OFFSET_LANDING',
                'LONG_RELEASE',
                'VERTICAL_SHAFT',
                'SWITCHBACK',
            ] as const,
        },
        EXPERT: {
            widthMin: 32, widthMax: 50,             // visual ~64-100 (precision landing)
            heightMin: 24, heightMax: 40,
            stepMin: 180, stepMax: 240,
            idealGap: 205,
            horizontalRatio: 0.90,
            idealHorizontal: 165,
            anchorLiftMin: 230, anchorLiftMax: 330,
            anchorOffsetMax: 150,
            recoveryChance: 0.10,
            riskChance: 0.25,
            chainLength: 6,
            voidMargin: 170,
            patterns: [
                'ZIGZAG',
                'WIDE_SWING',
                'TIGHT_PRECISION',
                'HOOK_CHAIN',
                'OFFSET_LANDING',
                'LONG_RELEASE',
                'VERTICAL_SHAFT',
                'HIGH_RISK_SHORTCUT',
                'SWITCHBACK',
                'RECOVERY_ROUTE',
            ] as const,
        },
        ENDLESS: {
            widthMin: 30, widthMax: 45,             // visual ~60-90
            heightMin: 20, heightMax: 38,
            stepMin: 190, stepMax: 250,
            idealGap: 215,
            horizontalRatio: 0.95,
            idealHorizontal: 175,
            anchorLiftMin: 240, anchorLiftMax: 340,
            anchorOffsetMax: 170,
            recoveryChance: 0.08,
            riskChance: 0.30,
            chainLength: 7,
            voidMargin: 150,
            patterns: [
                'ZIGZAG',
                'WIDE_SWING',
                'TIGHT_PRECISION',
                'HOOK_CHAIN',
                'OFFSET_LANDING',
                'LONG_RELEASE',
                'VERTICAL_SHAFT',
                'HIGH_RISK_SHORTCUT',
                'SWITCHBACK',
                'RECOVERY_ROUTE',
            ] as const,
        },
    },
    WORLD: {
        GRAVITY_Y: 1.2
    }
};