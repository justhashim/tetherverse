import { headers } from 'next/headers';

import {
    ApiUnavailableError,
    readBearerHeader,
    toResponse,
    tetherverseApi,
} from '@/src/lib/tetherverse-api';

/**
 * Score read and write, forwarded to the Tetherverse API.
 *
 * The Excel Play token is passed through untouched and verified by the API against
 * the accounts backend, so this route has no identity logic and no database code of
 * its own. A rejected token can never fall through to an anonymous write, because
 * this route never decides what a token means.
 */

export async function POST(request: Request) {
    try {
        const requestHeaders = await headers();

        const { score } = await request.json().catch(() => ({}) as { score?: unknown });

        // Reject a malformed score here rather than forwarding it, so a bad payload
        // costs one round trip less and the error names the actual problem.
        if (typeof score !== 'number' || isNaN(score) || score < 0) {
            return Response.json({ error: 'Invalid score value' }, { status: 400 });
        }

        return toResponse(
            await tetherverseApi.postScore(
                readBearerHeader(requestHeaders.get('authorization')),
                score,
            ),
        );
    } catch (error) {
        if (error instanceof ApiUnavailableError) {
            return Response.json(
                { error: 'Failed to process score' },
                { status: 502 },
            );
        }
        console.error('Score Save Error:', error);
        return Response.json({ error: 'Failed to process score' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const requestHeaders = await headers();

        return toResponse(
            await tetherverseApi.getScore(
                readBearerHeader(requestHeaders.get('authorization')),
            ),
        );
    } catch (error) {
        if (error instanceof ApiUnavailableError) {
            return Response.json({ error: 'Failed to fetch score' }, { status: 502 });
        }
        console.error('Score Fetch Error:', error);
        return Response.json({ error: 'Failed to fetch score' }, { status: 500 });
    }
}