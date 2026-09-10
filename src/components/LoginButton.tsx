"use client";

import { authClient } from "@/src/lib/auth-client";

export default function LoginButton() {
    // This hook automatically checks if the user is already logged in
    const { data: session, isPending } = authClient.useSession();

    const handleLogin = async () => {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/", // Where to redirect after logging in
        });
    };

    const handleLogout = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    window.location.reload(); // Refresh to clear the game state
                },
            },
        });
    };

    if (isPending) {
        return <div className="text-white">Loading...</div>;
    }

    if (session) {
        return (
            <div className="flex items-center gap-4 p-4 z-10 absolute top-0 right-0">
                <span className="text-zinc-300 font-mono text-xs">
                    Welcome, {session.user.name}
                </span>
                <button
                    onClick={handleLogout}
                    className="bg-zinc-900 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-200 border border-zinc-800 hover:border-rose-900/50 px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider transition-colors duration-150 active:scale-[0.98] cursor-pointer"
                >
                    Log Out
                </button>
            </div>
        );
    }

    return (
        <div className="absolute top-4 right-4 z-10">
            <button
                onClick={handleLogin}
                className="bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-950 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider border border-zinc-200 transition-colors duration-150 shadow-sm active:scale-[0.98] cursor-pointer"
            >
                Sign in with Google
            </button>
        </div>
    );
}