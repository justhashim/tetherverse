export const GAME_CONSTANTS = {
    PLAYER: {
        RADIUS: 24,
        DENSITY: 0.004, // Matter.js automatically calculates mass based on area * density
        FRICTION: 0.1,
        FRICTION_STATIC: 0.5,
        FRICTION_AIR: 0.05,
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
        DRIVE_FORCE: 0.05,               // Swing acceleration pump while holding
        FRICTION_AIR: 0.09,              // Air drag while hooked/swinging (punchy but controlled)
        FALLING_FRICTION_AIR: 0.10,      // Air drag during free-fall/launch (decelerates for landing)
        LAUNCH_BOOST: 1.2,               // Multiplier applied to swing velocity on release
    },
    LANDING: {
        SPEED_THRESHOLD: 14,             // Max total speed allowed for a settle-to-IDLE landing
    },
    CHECKPOINT: {
        RESPAWN_FALL_DISTANCE: 300,      // If unhooked and this far below the last safe spot, respawn there
        CAMP_GRACE_MS: 1500,             // Sustained slow rest below the death-void before game over
    },
    PROCEDURAL: {
        MIN_GAP_X: 200,                  // Minimum horizontal gap between consecutive platforms (guaranteed forward)
        MAX_GAP_X: 350,                  // Maximum horizontal gap
        MIN_PLATFORM_DIST: 200,          // Minimum center distance so platforms never stack/overlap
        MIN_STEP_Y: 120,                 // Climb: min px higher each step
        MAX_STEP_Y: 160,                 // Climb: max px higher each step
        ANCHOR_LIFT_MIN: 180,            // Anchor elevation above the gap baseline (min) - warmup
        ANCHOR_LIFT_MAX: 260,            // Anchor lift elevation above the gap baseline (max) - warmup
        MAX_REACH: 300,                  // Guarantee anchor stays within tether reach of player
        MAX_WORLD_X: 20000,              // World bound for platform X (matches matter.world right bound)
    },
    ALTITUDE: {
        COMPETITIVE_ZONE: 100,           // Altitude (m) where the Competitive tier begins
        MASTERY_ZONE: 300,               // Altitude (m) where the Mastery tier begins
    },
    DIFFICULTY: {
        // Width ranges are the BasePlatform width parameter (~visual width / 2).
        WARMUP: {
            widthMin: 90, widthMax: 110,             // generous platforms (visual ~180-220)
            gapMin: 200, gapMax: 260,
            stepMin: 120, stepMax: 160,
            anchorLiftMin: 180, anchorLiftMax: 260,
            anchorXOffset: 0,                        // centered, easy hooks
            voidMargin: 320,                         // forgiving death-void
        },
        COMPETITIVE: {
            widthMin: 40, widthMax: 60,              // narrower (visual ~80-120)
            gapMin: 280, gapMax: 360,
            stepMin: 140, stepMax: 200,
            anchorLiftMin: 230, anchorLiftMax: 330,
            anchorXOffset: 30,                       // offset so release must be precise
            voidMargin: 240,
        },
        MASTERY: {
            widthMin: 25, widthMax: 40,              // tight (visual ~50-80)
            gapMin: 350, gapMax: 420,
            stepMin: 160, stepMax: 220,
            anchorLiftMin: 260, anchorLiftMax: 360,
            anchorXOffset: 70,
            voidMargin: 170,
        },
    },
    WORLD: {
        GRAVITY_Y: 1.2
    }
};