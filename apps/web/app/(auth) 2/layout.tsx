import type { ReactNode } from "react";
import Link from "next/link";
import "../globals.css"; 
import "../styles/auth.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-container">
      {/* Logo Link - Top Left */}
      <Link href="/" className="auth-logo-link">
        Team Feedback
      </Link>
      
      {children}
    </main>
  );
}