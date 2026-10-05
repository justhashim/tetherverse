import { NextResponse } from "next/server";
import { fetchLeaderboard } from "@/src/lib/players";

// Next.js caches aggressively. This must stay fresh, because the leaderboard is
// the page players land on to compare personal bests.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const leaderboard = await fetchLeaderboard(10);

        return NextResponse.json({
            success: true,
            // Field names are kept as the game has always exposed them so the
            // leaderboard UI and the launcher card need no changes.
            leaderboard: leaderboard.map((entry) => ({
                _id: entry.name,
                name: entry.name,
                image: entry.image,
                maxAltitude: entry.maxAltitude,
            })),
        });

    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}