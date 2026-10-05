/**
 * Excel Play accounts backend. Server-side only: this URL must never reach the
 * browser.
 */
const ACCOUNTS_API_URL =
    process.env.EXCEL_ACCOUNTS_API_URL || 'https://accounts-api.excelmec.org/api';

export interface ExcelProfile {
    id: string;
    name: string;
    email: string;
    picture: string | null;
}

export interface ExcelTokenPair {
    accessToken: string;
    refreshToken?: string;
}

/**
 * Exchanges an Excel Play refresh token for an access token.
 *
 * The accounts backend issues the refresh token and hands it back through the
 * redirect after sign-in; this turns it into the bearer credential the rest of the
 * app uses.
 */
export async function exchangeRefreshToken(refreshToken: unknown): Promise<ExcelTokenPair | null> {
    if (typeof refreshToken !== 'string' || !refreshToken) return null;

    try {
        const response = await fetch(`${ACCOUNTS_API_URL}/Auth/refresh`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
            cache: 'no-store',
        });

        if (!response.ok) return null;

        const data = (await response.json().catch(() => null)) as
            | { accessToken?: unknown; refreshToken?: unknown }
            | null;

        if (!data || typeof data.accessToken !== 'string' || !data.accessToken) {
            return null;
        }

        return {
            accessToken: data.accessToken,
            refreshToken:
                typeof data.refreshToken === 'string' && data.refreshToken
                    ? data.refreshToken
                    : undefined,
        };
    } catch {
        return null;
    }
}

/**
 * Verifies an Excel Play access token against the accounts backend.
 *
 * The token arrives from a parent frame over postMessage, so it is treated as
 * attacker-controlled input until the backend confirms it. Nothing sent by the
 * client is trusted: the returned identity is built only from the backend's
 * response, which is why the caller must ignore any `user` object the parent
 * frame bundled alongside the token.
 */
export async function verifyExcelAccessToken(token: unknown): Promise<ExcelProfile | null> {
    if (typeof token !== 'string' || !token) return null;

    let response: Response;
    try {
        response = await fetch(`${ACCOUNTS_API_URL}/Profile/view`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
        });
    } catch {
        // Accounts backend unreachable. Treated as "not verified" so a network
        // blip can never be mistaken for a valid identity.
        return null;
    }

    if (!response.ok) return null;

    const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') return null;

    // The backend nests the profile differently across versions, so unwrap the
    // common shapes before reading fields.
    const body = (raw.data ?? raw.profile ?? raw.user ?? raw) as Record<string, unknown>;

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) return null;

    const rawId = body.user_id ?? body._id ?? body.id;
    const id = rawId === undefined || rawId === null || rawId === ''
        ? email
        : String(rawId);

    const name = typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : email.split('@')[0];

    const picture = typeof body.picture === 'string' && body.picture
        ? body.picture
        : null;

    return { id, name, email, picture };
}

/**
 * Extracts a bearer token from an Authorization header.
 */
export function readBearerToken(header: string | null): string | null {
    if (!header) return null;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match ? match[1].trim() : null;
}