import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

const makeReq = (path: string) => new NextRequest(`http://localhost${path}`);
const mockFetch = (value: Response) => vi.spyOn(global, "fetch").mockResolvedValue(value as any);

afterEach(() => vi.restoreAllMocks());

describe("middleware", () => {
  it("lets non-admin routes pass through", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const res = await middleware(makeReq("/about"));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects to login when auth check fails", async () => {
    mockFetch(new Response(null, { status: 401 }));
    const res = await middleware(makeReq("/admin"));
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects non-admin users to dashboard", async () => {
    mockFetch(new Response(JSON.stringify({ role: "STUDENT" }), { status: 200 }));
    const res = await middleware(makeReq("/admin/settings"));
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("allows admins through", async () => {
    mockFetch(new Response(JSON.stringify({ role: "ADMIN" }), { status: 200 }));
    const res = await middleware(makeReq("/admin"));
    expect(res.headers.get("location")).toBeNull();
  });
});
