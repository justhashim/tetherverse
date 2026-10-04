import { auth } from "@/src/lib/auth";
import { ensureMongoConnected } from "@/src/lib/db";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

// Better Auth binds the Db handle into its adapter when `auth.ts` is imported, so
// it cannot reconnect on its own: once the cached client's topology is closed,
// every auth call fails with "MongoTopologyClosedError: Topology is closed"
// until the process restarts. Reviving the topology per request is a cheap no-op
// while the connection is healthy.
export async function GET(request: Request) {
    await ensureMongoConnected();
    return handlers.GET(request);
}

export async function POST(request: Request) {
    await ensureMongoConnected();
    return handlers.POST(request);
}
