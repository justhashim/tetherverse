import { NextResponse } from 'next/server';

import {
    ApiUnavailableError,
    toResponse,
    tetherverseApi,
} from '@/src/lib/tetherverse-api';

/**
 * Verifies an Excel Play access token that arrived from the launcher frame.
 *
 * The token is only accepted once the Excel Play accounts backend confirms it, so
 * a tampered postMessage cannot invent an identity. The check itself lives in the
 * Tetherverse API, which keeps the accounts backend address out of this app
 * entirely; this route exists so the launcher bridge has an endpoint to call on its
 * own origin.
 */
export async function POST(request: Request) {
    try {
        const { token } = await request.json().catch(
            () => ({}) as { token?: unknown },
        );

        if (typeof token !== 'string' || !token) {
            return NextResponse.json({ error: 'token is required' }, { status: 400 });
        }

        return toResponse(await tetherverseApi.verifyToken(token));
    } catch (error) {
        if (error instanceof ApiUnavailableError) {
            return NextResponse.json(
                { error: 'Token could not be verified' },
                { status: 502 },
            );
        }
        console.error('Bridge verify error:', error);
        return NextResponse.json({ error: 'Token could not be verified' }, { status: 500 });
    }
}