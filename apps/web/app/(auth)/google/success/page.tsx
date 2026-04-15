"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { setAccessToken } from "@/features/auth/api/session";
import { Suspense } from "react";

function GoogleSuccessContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const redirect = searchParams.get("redirect") || "/app-home";

    if (token) {
      setAccessToken(token);
    }

    // Replace history entry so browser Back from bridge pages skips this transient callback page.
    // Full page navigation ensures the cookie is included in the server request.
    window.location.replace(redirect);
  }, [searchParams]);

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <p className="muted">Signing you in…</p>
    </div>
  );
}

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={null}>
      <GoogleSuccessContent />
    </Suspense>
  );
}