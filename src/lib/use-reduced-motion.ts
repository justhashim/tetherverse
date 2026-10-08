'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks `prefers-reduced-motion`.
 *
 * Motion is decorative everywhere it is used in this game: menu entrances, the
 * drifting background, panel transitions, pulsing status dots. None of it carries
 * information that is not also available in text, so all of it can collapse to a
 * static state without losing anything.
 *
 * `useSyncExternalStore` rather than `useState` plus an effect. A media query is
 * an external store, and this reads it without the cascading render that a
 * `setState` inside an effect causes. `getServerSnapshot` returns `false` because
 * a server has no way to know the visitor's preference, which keeps the first
 * paint identical on both sides and lets React re-render on the client.
 *
 * Framer's own `useReducedMotion` covers `whileHover` and `whileTap`. This hook
 * is for the CSS `animate-*` utilities, which know nothing about user
 * preference, and for conditional logic in components that are not motion
 * components.
 */
export function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const list = window.matchMedia(QUERY);
            list.addEventListener('change', onChange);
            return () => list.removeEventListener('change', onChange);
        },
        () => window.matchMedia(QUERY).matches,
        () => false,
    );
}