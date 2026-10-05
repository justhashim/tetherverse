import { NextRequest, NextResponse } from 'next/server';
import { exchangeRefreshToken } from '@/src/lib/excel-auth';

/**
 * Exchanges an Excel Play refresh token for an access token.
 *
 * The refresh token arrives in the redirect after sign-in. Exchanging it here keeps
 * the accounts backend URL server-side and means the browser only ever handles the
 * short-lived access token.
 */
export async function POST(request: NextRequest) {
    let refreshToken: unknown;
    try {
        ({ refreshToken } = await request.json());
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (typeof refreshToken !== 'string' || !refreshToken) {
        return NextResponse.json({ error: 'refreshToken is required' }, { status: 400 });
    }

    const pair = await exchangeRefreshToken(refreshToken);

    if (!pair) {
        return NextResponse.json(
            { error: 'The Excel Play accounts backend rejected the refresh token' },
            { status: 401 },
        );
    }

    return NextResponse.json(pair);
}