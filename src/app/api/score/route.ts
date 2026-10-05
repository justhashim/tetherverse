import { headers } from "next/headers";
import {
    readBearerToken,
    verifyExcelAccessToken,
} from "@/src/lib/excel-auth";
import { getPlayerRecordByEmail, recordRun } from "@/src/lib/players";

/**
 * Resolves who is making this request.
 *
 * The only identity is an Excel Play access token, verified against the accounts
 * backend. It is sent as a bearer by both entry points: standalone play (from the
 * Excel session hook) and embedded play (bridged from the launcher).
 *
 * Returns null when there is no token, or when the accounts backend does not
 * confirm it. A rejected token must never fall through to an anonymous write.
 */
async function verifyRequestIdentity() {
    const requestHeaders = await headers();

    const token = readBearerToken(requestHeaders.get("authorization"));
    if (!token) return null;

    return verifyExcelAccessToken(token);
}

export async function POST(request: Request) {
    try {
        const profile = await verifyRequestIdentity();

        if (!profile) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { score } = await request.json();

        if (typeof score !== "number" || isNaN(score) || score < 0) {
            return Response.json({ error: "Invalid score value" }, { status: 400 });
        }

        // One atomic statement: creates the player and their leaderboard row if
        // this is their first run, then raises the personal best.
        const result = await recordRun(
            {
                excelUserId: profile.id,
                email: profile.email,
                name: profile.name,
                image: profile.picture,
            },
            score,
        );

        if (result.isNewBest) {
            console.log(`New personal best for ${result.email}: ${result.maxAltitude}m`);
        }

        return Response.json({
            success: true,
            updated: result.isNewBest,
            maxAltitude: result.maxAltitude,
        });

    } catch (error) {
        console.error("Score Save Error:", error);
        return Response.json({ error: "Failed to process score" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const profile = await verifyRequestIdentity();

        if (!profile) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const record = await getPlayerRecordByEmail(profile.email);

        return Response.json({
            success: true,
            maxAltitude: record?.maxAltitude ?? 0,
        });

    } catch (error) {
        console.error("Score Fetch Error:", error);
        return Response.json({ error: "Failed to fetch score" }, { status: 500 });
    }
}