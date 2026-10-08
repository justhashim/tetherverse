import {
    ApiUnavailableError,
    toResponse,
    tetherverseApi,
} from '@/src/lib/tetherverse-api';

// Next.js caches aggressively. This must stay fresh, because the leaderboard is
// the page players land on to compare personal bests.
export const dynamic = 'force-dynamic';

/**
 * The public leaderboard, forwarded to the Tetherverse API.
 *
 * No token is needed: the API reads only `player_points`, which carries a display
 * name and avatar but no email, so the leaderboard exposes no player identity and
 * never touches the profile table.
 */
export async function GET() {
    try {
        return toResponse(await tetherverseApi.getLeaderboard());
    } catch (error) {
        if (error instanceof ApiUnavailableError) {
            return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 502 });
        }
        console.error('Leaderboard fetch error:', error);
        return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}