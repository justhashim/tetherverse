import { NextRequest, NextResponse } from 'next/server';

import {
    ApiUnavailableError,
    toResponse,
    tetherverseApi,
} from '@/src/lib/tetherverse-api';

/**
 * Exchanges an Excel Play refresh token for an access token.
 *
 * The refresh token arrives in the redirect after sign-in. Exchanging it through the
 * API keeps the accounts backend URL out of this app entirely, and means the
 * browser only ever handles the short-lived access token.
 */
export async function POST(request: NextRequest) {
    try {
        const { refreshToken } = await request.json().catch(
            () => ({}) as { refreshToken?: unknown },
        );

        if (typeof refreshToken !== 'string' || !refreshToken) {
            return NextResponse.json(
                { error: 'refreshToken is required' },
                { status: 400 },
            );
        }

        return toResponse(await tetherverseApi.exchangeRefreshToken(refreshToken));
    } catch (error) {
        if (error instanceof ApiUnavailableError) {
            return NextResponse.json(
                { error: 'Could not exchange the refresh token' },
                { status: 502 },
            );
        }
        console.error('Excel auth exchange error:', error);
        return NextResponse.json(
            { error: 'Could not exchange the refresh token' },
            { status: 500 },
        );
    }
}