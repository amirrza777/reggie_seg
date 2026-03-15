"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { setAccessToken } from "@/features/auth/api/session";
import { Suspense } from "react";

function GoogleSuccessContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const redirect = searchParams.get("redirect") || "/dashboard";

    if (token) {
      setAccessToken(token);
    }

    // Full page reload ensures the cookie is included in the server request
    // so getCurrentUser() can authenticate the user server-side
    window.location.href = redirect;
  }, []);

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
