"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { getEnterpriseModuleJoinCode } from "../api/client";

type ModuleJoinCodeCardProps = {
  moduleId: number;
  initialJoinCode?: string | null;
  showCreatedBanner?: boolean;
};

type JoinCodeStatus = "loading" | "success" | "error";

export function ModuleJoinCodeCard({
  moduleId,
  initialJoinCode = null,
  showCreatedBanner = false,
}: ModuleJoinCodeCardProps) {
  const [status, setStatus] = useState<JoinCodeStatus>(initialJoinCode ? "success" : "loading");
  const [joinCode, setJoinCode] = useState<string | null>(initialJoinCode);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialJoinCode) {
      return;
    }

    let active = true;

    async function loadJoinCode() {
      setStatus((current) => (current === "success" && joinCode ? current : "loading"));
      try {
        const response = await getEnterpriseModuleJoinCode(moduleId);
        if (!active) return;
        setJoinCode(response.joinCode);
        setStatus("success");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not load the module join code.");
      }
    }

    void loadJoinCode();
    return () => {
      active = false;
    };
  }, [initialJoinCode, moduleId]);

  const handleCopy = async () => {
    if (!joinCode || typeof navigator === "undefined" || !navigator.clipboard) {
      setMessage("Copy is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(joinCode);
      setMessage("Join code copied.");
    } catch {
      setMessage("Could not copy the join code.");
    }
  };

  return (
    <div className="enterprise-module-create__field enterprise-module-create__field--join-code">
      <Card
        title={<span className="overview-title">Join code</span>}
        action={
          status === "success" && joinCode ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
              Copy code
            </Button>
          ) : undefined
        }
        className="enterprise-module-join-code__card"
      >
        {showCreatedBanner ? (
          <div className="status-alert status-alert--success enterprise-module-join-code__banner">
            Module created. Students can now join with this code.
          </div>
        ) : null}
        {status === "loading" ? <p className="muted">Loading module join code...</p> : null}
        {status === "error" ? <div className="status-alert status-alert--error">{message}</div> : null}
        {status === "success" && joinCode ? (
          <div className="enterprise-module-join-code__content">
            <p className="muted">
              Share this code with students in your enterprise. Manual student assignment is still available below.
            </p>
            <div className="enterprise-module-join-code__value" aria-label="Module join code">
              {joinCode}
            </div>
            {message ? <p className="ui-note ui-note--muted">{message}</p> : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
