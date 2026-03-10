import Link from "next/link";
import { getCurrentUser } from "@/shared/auth/session";

export default async function NotFound() {
  const user = await getCurrentUser();
  const destination = user ? "/dashboard" : "/";
  const ctaLabel = user ? "Go to dashboard" : "Go to home";

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <section style={{ maxWidth: 520, width: "100%", textAlign: "center", display: "grid", gap: 12 }}>
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="lede">The page you’re looking for doesn’t exist or has moved.</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link href={destination} className="btn btn--primary">
            {ctaLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
