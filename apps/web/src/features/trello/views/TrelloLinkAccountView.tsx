"use client";

import { usePathname } from "next/navigation";
import { getConnectUrl, getLinkToken } from "@/features/trello/api/client";
import "@/features/trello/styles/link-account.css";

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
    <section className="stack projects-panel trello-setup trello-setup--simple">
      <header className="projects-panel__header trello-setup__header">
        <h1 className="projects-panel__title">Connect your Trello account</h1>
        <p className="projects-panel__subtitle">Connect your Trello account to link a board to this team.</p>
      </header>
      <div className="trello-setup__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={handleConnect}>
          Connect Trello
        </button>
      </div>
    </section>
  );
}
