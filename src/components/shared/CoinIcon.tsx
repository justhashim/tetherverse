/**
 * The coin, as an icon.
 *
 * Drawn to match the sprite the game generates in `createCoinTexture`, so the
 * currency in the HUD and the currency on the platform are visibly the same
 * object: amber face, darker rim, a lighter highlight, and a vertical slot.
 *
 * Inlined rather than pulled from an icon library. The palette is specific to
 * this coin, and a generic "coins" glyph from a set would be a different colour
 * and a different shape from the thing the player is collecting.
 */

interface CoinIconProps {
    /** Rendered size in pixels. Keeps stroke weight visually constant across sizes. */
    size?: number;
    /** Dims the icon for coins that are collected but not yet banked. */
    muted?: boolean;
    className?: string;
}

export default function CoinIcon({
    size = 16,
    muted = false,
    className = '',
}: CoinIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`shrink-0 ${className}`}
            aria-hidden="true"
            focusable="false"
        >
            {/* Rim. Sits behind the face so the edge reads as thickness. */}
            <circle cx="12" cy="12" r="11" fill={muted ? '#92400e' : '#c98a12'} />
            {/* Face. */}
            <circle cx="12" cy="12" r="9.5" fill={muted ? '#b45309' : '#ffc94d'} />
            {/* Highlight, offset up-left to imply a light source matching the sprite. */}
            <circle cx="9.5" cy="9.5" r="5.5" fill={muted ? '#d97706' : '#ffe9a8'} />
            {/* Slot. */}
            <rect
                x="11"
                y="5.5"
                width="2"
                height="13"
                rx="0.5"
                fill={muted ? '#78350f' : '#c98a12'}
            />
        </svg>
    );
}