import { connectToDatabase } from "@/src/lib/db";
import { NextResponse } from "next/server";

// CRITICAL: Next.js aggressively caches GET requests. 
// This line forces the server to fetch fresh scores every single time!
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('user');

        // Fetch the top 10 users who actually have a score above 0
        const topPlayers = await collection
            .find({ maxAltitude: { $gt: 0 } })
            .project({ name: 1, image: 1, maxAltitude: 1 }) // Only pull the data we need to save bandwidth
            .sort({ maxAltitude: -1 }) // Sort descending (highest score first)
            .limit(10) // Only grab the top 10
            .toArray();

        return NextResponse.json({ success: true, leaderboard: topPlayers });

    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}