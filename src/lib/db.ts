import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}

declare global {
    // eslint-disable-next-line no-var
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

export const mongoClient = client;
export const mongoDb = client.db();

/**
 * Returns the native MongoDB database instance.
 * Also provides `.connection.collection(...)` for backwards compatibility.
 */
export async function connectToDatabase(): Promise<Db & { connection: { collection: (name: string) => any } }> {
    return Object.assign(mongoDb, {
        connection: {
            collection: (name: string) => mongoDb.collection(name),
        },
    });
}