export const GAME_CONSTANTS = {
    PLAYER: {
        RADIUS: 24,
        DENSITY: 0.004, // Matter.js automatically calculates mass based on area * density
        FRICTION: 0.1,
        FRICTION_STATIC: 0.5,
        FRICTION_AIR: 0.05,
        BOUNCE: 0.2,    // Restitution
    },
    LAUNCH: {
        MIN_DRAG_DISTANCE: 15,  // Pixels required to initiate an intentional launch drag
        MAX_DRAG_DISTANCE: 200, // Distance cap where launch velocity maxes out
        MIN_VELOCITY: 2,        // Minimum safe escape velocity threshold
        MAX_VELOCITY: 28,       // Hard physics velocity cap for launch force
        SMOOTHING_FACTOR: 0.15, // Input interpolation modifier
    },
    WORLD: {
        GRAVITY_Y: 1.2
    }
};