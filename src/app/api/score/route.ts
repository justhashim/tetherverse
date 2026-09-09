import { auth } from "@/src/lib/auth";
import { headers } from "next/headers";
import { connectToDatabase } from "@/src/lib/db";
import { ObjectId, Filter } from "mongodb";

function buildUserQuery(userId: string): Filter<any> {
    if (ObjectId.isValid(userId) && String(new ObjectId(userId)) === userId) {
        return {
            $or: [
                { _id: new ObjectId(userId) },
                { _id: userId as any },
                { id: userId }
            ]
        };
    }
    return {
        $or: [
            { _id: userId as any },
            { id: userId }
        ]
    };
}

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { score } = await request.json();

        if (typeof score !== "number" || isNaN(score) || score < 0) {
            return Response.json({ error: "Invalid score value" }, { status: 400 });
        }

        const db = await connectToDatabase();
        const collection = db.collection('user');
        const query = buildUserQuery(session.user.id);

        const currentUser = await collection.findOne(query);
        const currentRecord = currentUser?.maxAltitude || 0;

        if (score > currentRecord) {
            await collection.updateOne(
                query,
                { $set: { maxAltitude: score } }
            );
            return Response.json({ success: true, updated: true, newRecord: score });
        }

        return Response.json({ success: true, updated: false, currentRecord });

    } catch (error) {
        console.error("Score Save Error:", error);
        return Response.json({ error: "Failed to process score" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fast path: Better-Auth already fetches user additionalFields (including maxAltitude)
        // during session retrieval. Returning it directly avoids an extra 100-300ms database roundtrip!
        const sessionUser = session.user as any;
        if (typeof sessionUser.maxAltitude === "number") {
            return Response.json({ success: true, maxAltitude: sessionUser.maxAltitude });
        }

        // Fallback: Query the user collection using the shared native pool
        const db = await connectToDatabase();
        const collection = db.collection('user');
        const query = buildUserQuery(session.user.id);

        const currentUser = await collection.findOne(query);
        const maxAltitude = currentUser?.maxAltitude || 0;

        return Response.json({ success: true, maxAltitude });

    } catch (error) {
        console.error("Score Fetch Error:", error);
        return Response.json({ error: "Failed to fetch score" }, { status: 500 });
    }
}