// Shared CORS headers for edge functions
// Replace '*' with actual domain in production

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://nusd-wallet-production.up.railway.app',
    // Add your production domain here
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
    // Check if origin is in allowed list
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0]; // Default to first allowed

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
    };
}

// For backward compatibility - use with caution
export const corsHeadersWildcard = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
