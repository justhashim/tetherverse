import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { mongoDb } from "@/src/lib/db";

export const auth = betterAuth({
    database: mongodbAdapter(mongoDb),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }
    },
    user: {
        additionalFields: {
            // We inject our custom game stat directly into the Auth User table!
            maxAltitude: {
                type: "number",
                required: false,
                defaultValue: 0
            }
        }
    }
});