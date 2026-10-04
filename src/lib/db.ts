import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}

declare global {
    var _mongoClient: MongoClient | undefined;
}

// Reuse the native MongoClient in development to avoid creating multiple connection pools during HMR
const client = global._mongoClient || new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
});

if (process.env.NODE_ENV === 'development') {
    global._mongoClient = client;
}

/**
 * Guarantees the client has a live topology, reconnecting if needed.
 *
 * The client cached on `global` can outlive the topology behind it: a dev-time
 * module reload, a graceful shutdown, or a dropped connection all leave a closed
 * topology in place. The driver never revives a closed topology on its own, so
 * every later operation fails instantly with
 * `MongoTopologyClosedError: Topology is closed`.
 *
 * `MongoClient.connect()` is idempotent: a no-op when the topology is already
 * live, and it re-establishes the connection when the client was closed. That
 * makes it safe to call on every request. Note that the `client.topology`
 * liveness check used by MongoDB's own Next.js snippet no longer type-checks
 * here, since v7 of the driver marks `topology` as internal.
 */
export async function ensureMongoConnected(): Promise<void> {
    await client.connect();
}

// Connect eagerly at module load. Better Auth binds this Db handle into its
// adapter when `auth.ts` is imported, before any request handler runs, so the
// topology has to be live before that happens. On a dev reload this also
// revives a stale cached client instead of handing it to the adapter dead.
await ensureMongoConnected();

export const mongoClient = client;
export const mongoDb = client.db();

/**
 * Returns the native MongoDB database instance.
 * Also provides `.connection.collection(...)` for backwards compatibility.
 */
export async function connectToDatabase(): Promise<Db & { connection: { collection: <T extends Document = Document>(name: string) => Collection<T> } }> {
    await ensureMongoConnected();
    return Object.assign(mongoDb, {
        connection: {
            collection: <T extends Document = Document>(name: string) => mongoDb.collection<T>(name),
        },
    });
}