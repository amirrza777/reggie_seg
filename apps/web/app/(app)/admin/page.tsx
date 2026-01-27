"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin landing page: immediately send users to the peer assessments dashboard.
 * Prevents 404 when visiting /admin directly.
 */
export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/peerAssessments");
  }, [router]);

  return null;
}
