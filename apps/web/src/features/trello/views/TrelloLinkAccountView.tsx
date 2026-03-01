"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getConnectUrl, getLinkToken } from "@/features/trello/api/client";
type Props = {
  projectId: string;
  onError: (message: string) => void;
};

export function TrelloLinkAccountView({ projectId, onError }: Props) {
  const pathname = usePathname();

  const handleConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { linkToken } = await getLinkToken();
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/projects/${projectId}/trello/callback`
          : undefined;
      const { url } = await getConnectUrl(callbackUrl);
      try {
        sessionStorage.setItem("trello.linkToken", linkToken);
        if (typeof pathname === "string") {
          sessionStorage.setItem("trello.returnTo", pathname);
        }
      } catch {
        // ignore
      }
      window.location.href = url;
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to start Trello link.");
    }
  };

  return (
    <div className="stack" style={{ padding: 24 }}>
      <h2>Link your Trello account</h2>
      <p>Connect your Trello account to link a board to this team.</p>
      <Link
        href="#"
        onClick={handleConnect}
      >
        Connect Trello
      </Link>
      <Link href={`/projects/${projectId}`}>← Back to project</Link>
    </div>
  );
}
