type CorsEnv = {
  APP_BASE_URL?: string;
  ALLOWED_ORIGINS?: string;
};

const LOCAL_ALLOWED_ORIGINS = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:5173",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:5173",
];

// Allow Vercel preview deployment URLs for this project (e.g. reggie-abc123-amirrza777s-projects.vercel.app)
const VERCEL_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+-amirrza777s-projects\.vercel\.app$/;

export function resolveAllowedOrigins(env: CorsEnv = process.env): string[] {
  return [
    ...LOCAL_ALLOWED_ORIGINS,
    ...(env.APP_BASE_URL ? [env.APP_BASE_URL.replace(/\/$/, "")] : []),
    ...(env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
      : []),
  ];
}

export function isAllowedCorsOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  return !origin || allowedOrigins.includes(origin) || VERCEL_PREVIEW_PATTERN.test(origin);
}

