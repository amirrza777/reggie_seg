import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

type EnvSnapshot = {
  APP_BASE_URL?: string;
  ALLOWED_ORIGINS?: string;
};

const ORIGINAL_ENV: EnvSnapshot = {
  APP_BASE_URL: process.env.APP_BASE_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
};

function restoreCorsEnv(snapshot: EnvSnapshot) {
  if (snapshot.APP_BASE_URL === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = snapshot.APP_BASE_URL;

  if (snapshot.ALLOWED_ORIGINS === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = snapshot.ALLOWED_ORIGINS;
}

afterEach(() => {
  restoreCorsEnv(ORIGINAL_ENV);
});

describe("app CORS env origins", () => {
  it("allows origins from APP_BASE_URL and ALLOWED_ORIGINS", async () => {
    process.env.APP_BASE_URL = "https://app.example.com/";
    process.env.ALLOWED_ORIGINS = "https://alt.example.com, https://other.example.com";
    vi.resetModules();

    const { app } = await import("./app.js");

    const fromAppBase = await request(app).get("/health").set("Origin", "https://app.example.com");
    expect(fromAppBase.status).toBe(200);
    expect(fromAppBase.headers["access-control-allow-origin"]).toBe("https://app.example.com");

    const fromAllowedOrigins = await request(app).get("/health").set("Origin", "https://alt.example.com");
    expect(fromAllowedOrigins.status).toBe(200);
    expect(fromAllowedOrigins.headers["access-control-allow-origin"]).toBe("https://alt.example.com");
  });
});
