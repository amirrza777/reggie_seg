import type { ReactNode } from "react";
import Link from "next/link";
import { BrandWordmark } from "@/shared/layout/BrandWordmark";
import "../styles/global-marketing.css";
import "../styles/auth.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-container marketing-shell">
      {/* Logo Link - Top Left */}
      <Link href="/" className="auth-logo-link">
        <BrandWordmark />
      </Link>
      
      {children}
    </main>
  );
}
