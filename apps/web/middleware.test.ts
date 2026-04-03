import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

const makeReq = (path: string) => new NextRequest(`http://localhost${path}`);
const mockFetch = (value: Response) => vi.spyOn(global, "fetch").mockResolvedValue(value);

afterEach(() => vi.restoreAllMocks());

describe("middleware", () => {
  it("lets non-admin routes pass through", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const res = await middleware(makeReq("/about"));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not guard lookalike prefixes that are not workspace/admin routes", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const res = await middleware(makeReq("/administer"));
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

  it("redirects enterprise-admin users away from /staff routes to their enterprise home", async () => {
    mockFetch(new Response(JSON.stringify({ role: "ENTERPRISE_ADMIN" }), { status: 200 }));
    const res = await middleware(makeReq("/staff/projects"));
    expect(res.headers.get("location")).toContain("/enterprise");
  });

  it("redirects non-enterprise users away from enterprise routes", async () => {
    mockFetch(new Response(JSON.stringify({ role: "STUDENT" }), { status: 200 }));
    const res = await middleware(makeReq("/enterprise/modules"));
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("redirects staff-only users from workspace routes to /staff/dashboard", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async () => new Response(JSON.stringify({ role: "STAFF", isStaff: true }), { status: 200 }));
    const dashboardRes = await middleware(makeReq("/dashboard"));
    expect(dashboardRes.headers.get("location")).toContain("/staff/dashboard");

    const projectsRes = await middleware(makeReq("/projects/123"));
    expect(projectsRes.headers.get("location")).toContain("/staff/dashboard");
  });

  it("allows staff-only users through /staff routes", async () => {
    mockFetch(new Response(JSON.stringify({ role: "STAFF", isStaff: true }), { status: 200 }));
    const res = await middleware(makeReq("/staff/dashboard"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects to login when auth request throws", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const res = await middleware(makeReq("/admin"));
    expect(res.headers.get("location")).toContain("/login");
  });
});
