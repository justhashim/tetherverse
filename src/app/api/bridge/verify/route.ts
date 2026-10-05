import { NextRequest, NextResponse } from 'next/server';
import { verifyExcelAccessToken } from '@/src/lib/excel-auth';

/**
 * Verifies an Excel Play access token that arrived from the launcher frame.
 *
 * The token is only accepted once the accounts backend confirms it, so a
 * tampered postMessage cannot invent an identity.
 */
export async function POST(request: NextRequest) {
    let token: unknown;
    try {
        ({ token } = await request.json());
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (typeof token !== 'string' || !token) {
        return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const profile = await verifyExcelAccessToken(token);

    if (!profile) {
        return NextResponse.json(
            { error: 'Token rejected by the Excel Play accounts backend' },
            { status: 401 },
        );
    }

    return NextResponse.json({ user: profile });
}