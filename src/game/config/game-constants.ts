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
        MAX_LAUNCH_SPEED: 30,     // Cap applied to released launch velocity (scaled, dir preserved)
    },
    SWING: {
        CONSTRAINT_STIFFNESS: 0.08,      // Tether spring stiffness (lower = softer pull)
        DRIVE_FORCE: 0.07,               // Swing acceleration pump while holding (responsive & punchy)
        FRICTION_AIR: 0.02,              // Air drag while hooked/swinging (preserves momentum)
        FALLING_FRICTION_AIR: 0.025,     // Air drag during free-fall/launch (smooth soaring arcs)
        LAUNCH_BOOST: 1.25,              // Multiplier applied to swing velocity on release
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
        MAX_VERTICAL_GAP: 250,          // Maximum vertical separation
        MIN_HORIZONTAL_GAP: 120,        // Minimum sideways travel per platform
        MAX_HORIZONTAL_GAP: 300,        // Maximum sideways travel per platform
        CANDIDATE_COUNT: 10,            // Candidates sampled per placement
        MAX_CANDIDATE_ATTEMPTS: 4,      // Retry rounds before fallback
        MAX_GENERATED_PER_FRAME: 4,     // Work cap per frame
        LOCAL_CHECK_RADIUS: 500,        // Nearby-platform scan radius for clearance/density checks
        CLEARANCE_PAD: 60,              // Visual separation beyond physical collision clearance
        DENSITY_WINDOW: 500,            // Vertical window for the platform-spam safety cap
        DENSITY_HBOX: 350,              // Horizontal band for the platform-spam safety cap
        MAX_PLATFORMS_PER_WINDOW: 4,    // Max platform count inside the density window
        CULL_DISTANCE: 3000,            // Destroy platforms/hooks this far below the player
    },
    ALTITUDE: {
        INTERMEDIATE_ZONE: 500,         // Altitude (m) where the Intermediate tier begins
        HARD_ZONE: 1500,                // Altitude (m) where the Hard tier begins
        EXPERT_ZONE: 3000,              // Altitude (m) where the Expert tier begins
        ENDLESS_ZONE: 10000,            // Altitude (m) where the Endless Mastery tier begins
    },
    DIFFICULTY: {
        // Width ranges are the BasePlatform width parameter (~visual width / 2).
        // Every band is hard-capped by PROCEDURAL.PLATFORM_REACH so a tier can never
        // generate a physically impossible platform.
        TUTORIAL: {
            widthMin: 100, widthMax: 130,           // generous platforms (visual ~200-260)
            heightMin: 30, heightMax: 50,           // tall, forgiving landings
            stepMin: 140, stepMax: 180,             // meaningful rhythm climb (floor 130 via constants)
            idealGap: 150,                          // spacing score target (Lerp toward 220 with difficulty)
            horizontalRatio: 0.45,                  // fraction of reach usable sideways
            idealHorizontal: 110,                   // horizontal score target
            anchorLiftMin: 140, anchorLiftMax: 200,
            anchorOffsetMax: 40,
            recoveryChance: 0.35,                   // authored recovery riders (skill saves)
            riskChance: 0,                          // no high-risk shortcuts yet
            chainLength: 4,                         // platforms per adrenaline beat
            voidMargin: 320,                        // forgiving death-void
            patterns: [
                'STRAIGHT_ASCENT',
                'LEFT_SWING',
                'RIGHT_SWING',
                'ZIGZAG',
            ] as const,
        },
        INTERMEDIATE: {
            widthMin: 70, widthMax: 100,             // (visual ~140-200)
            heightMin: 28, heightMax: 46,
            stepMin: 160, stepMax: 200,
            idealGap: 170,
            horizontalRatio: 0.65,
            idealHorizontal: 130,
            anchorLiftMin: 170, anchorLiftMax: 250,
            anchorOffsetMax: 80,
            recoveryChance: 0.25,
            riskChance: 0.08,
            chainLength: 5,
            voidMargin: 260,
            patterns: [
                'STRAIGHT_ASCENT',
                'LEFT_SWING',
                'RIGHT_SWING',
                'ZIGZAG',
                'WIDE_SWING',
                'HOOK_CHAIN',
                'OFFSET_LANDING',
            ] as const,
        },
        HARD: {
            widthMin: 55, widthMax: 80,               // (visual ~110-160)
            heightMin: 26, heightMax: 44,
            stepMin: 170, stepMax: 215,
            idealGap: 185,
            horizontalRatio: 0.80,
            idealHorizontal: 145,
            anchorLiftMin: 200, anchorLiftMax: 300,
            anchorOffsetMax: 120,
            recoveryChance: 0.18,
            riskChance: 0.16,
            chainLength: 5,
            voidMargin: 220,
            patterns: [
                'STRAIGHT_ASCENT',
                'ZIGZAG',
                'WIDE_SWING',
                'TIGHT_PRECISION',
                'HOOK_CHAIN',
                'OFFSET_LANDING',
                'LONG_RELEASE',
                'VERTICAL_SHAFT',
            ] as const,
        },
        EXPERT: {
            widthMin: 40, widthMax: 60,               // tight (visual ~80-120)
            heightMin: 24, heightMax: 42,
            stepMin: 180, stepMax: 225,
            idealGap: 195,
            horizontalRatio: 0.90,
            idealHorizontal: 160,
            anchorLiftMin: 230, anchorLiftMax: 330,
            anchorOffsetMax: 150,
            recoveryChance: 0.12,
            riskChance: 0.25,
            chainLength: 6,
            voidMargin: 180,
            patterns: [
                'ZIGZAG',
                'WIDE_SWING',
                'TIGHT_PRECISION',
                'HOOK_CHAIN',
                'OFFSET_LANDING',
                'LONG_RELEASE',
                'VERTICAL_SHAFT',
                'HIGH_RISK_SHORTCUT',
                'RECOVERY_ROUTE',
            ] as const,
        },
        ENDLESS: {
            widthMin: 40, widthMax: 60,               // same hard ceiling, more combinations
            heightMin: 20, heightMax: 40,
            stepMin: 190, stepMax: 230,
            idealGap: 205,
            horizontalRatio: 0.95,
            idealHorizontal: 170,
            anchorLiftMin: 240, anchorLiftMax: 340,
            anchorOffsetMax: 170,
            recoveryChance: 0.10,
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
                'RECOVERY_ROUTE',
            ] as const,
        },
    },
    WORLD: {
        GRAVITY_Y: 1.2
    }
};