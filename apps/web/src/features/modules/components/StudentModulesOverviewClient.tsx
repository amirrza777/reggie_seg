"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { joinModuleByCode, listModules } from "../api/client";
import type { JoinModuleResponse, Module } from "../types";
import { ModuleList } from "./ModuleList";

type StudentModulesOverviewClientProps = {
  initialModules: Module[];
  userId: number;
  canJoin: boolean;
};

type JoinStatus = "idle" | "submitting" | "success" | "error";

export function StudentModulesOverviewClient({
  initialModules,
  userId,
  canJoin,
}: StudentModulesOverviewClientProps) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinResult, setJoinResult] = useState<JoinModuleResponse | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  useEffect(() => {
    if (!isJoinDialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && joinStatus !== "submitting") {
        event.preventDefault();
        closeJoinDialog();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isJoinDialogOpen, joinStatus]);

  const openJoinDialog = () => {
    setJoinCode("");
    setJoinError(null);
    setJoinResult(null);
    setJoinStatus("idle");
    setIsJoinDialogOpen(true);
  };

  const closeJoinDialog = () => {
    if (joinStatus === "submitting") return;
    setIsJoinDialogOpen(false);
  };

  const handleSubmit = async () => {
    const normalizedCode = joinCode.trim();
    if (!normalizedCode) {
      setJoinError("Enter a module code to continue.");
      setJoinStatus("error");
      return;
    }

    setJoinStatus("submitting");
    setJoinError(null);
    try {
      const response = await joinModuleByCode({ code: normalizedCode });
      const refreshedModules = await listModules(userId);
      setModules(refreshedModules);
      setJoinResult(response);
      setJoinStatus("success");
      setBannerMessage(
        response.alreadyEnrolled
          ? `${response.moduleName} is already on your workspace.`
          : `${response.moduleName} has been added to your modules.`,
      );
      router.refresh();
    } catch (error) {
      setJoinStatus("error");
      setJoinError(error instanceof Error ? error.message : "Could not join that module right now.");
    }
  };

  return (
    <Card title="Active modules">
      {bannerMessage ? <div className="status-alert status-alert--success module-list__banner">{bannerMessage}</div> : null}
      <ModuleList
        modules={modules}
        emptyMessage="No modules assigned yet."
        toolbarAction={
          canJoin ? (
            <Button type="button" variant="primary" onClick={openJoinDialog}>
              Join module
            </Button>
          ) : null
        }
      />
      <JoinModuleDialog
        open={isJoinDialogOpen}
        code={joinCode}
        status={joinStatus}
        error={joinError}
        result={joinResult}
        onCodeChange={setJoinCode}
        onClose={closeJoinDialog}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}

function JoinModuleDialog(props: {
  open: boolean;
  code: string;
  status: JoinStatus;
  error: string | null;
  result: JoinModuleResponse | null;
  onCodeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="join-module-title" onClick={props.onClose}>
      <div className="modal__dialog module-join-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header ui-modal-header">
          <h3 id="join-module-title">Join module</h3>
          <Button
            type="button"
            variant="ghost"
            className="modal__close-btn"
            aria-label="Close"
            onClick={props.onClose}
            disabled={props.status === "submitting"}
          >
            ×
          </Button>
        </div>
        <div className="modal__body module-join-modal__body">
          {props.status === "success" && props.result ? (
            <div className="module-join-modal__success">
              <p className="module-join-modal__headline">
                {props.result.alreadyEnrolled ? "Module already linked" : "Module joined"}
              </p>
              <p className="muted">
                {props.result.alreadyEnrolled
                  ? `${props.result.moduleName} is already available in your workspace.`
                  : `${props.result.moduleName} is now available in your workspace.`}
              </p>
            </div>
          ) : (
            <>
              <p className="muted">Enter the module join code shared by your module lead or enterprise admin.</p>
              <label htmlFor="join-module-code" className="module-list__sort-label">
                Join code
              </label>
              <FormField
                id="join-module-code"
                value={props.code}
                onChange={(event) => props.onCodeChange(event.target.value.toUpperCase())}
                placeholder="ABCD2345"
                autoFocus
                aria-invalid={props.error ? true : undefined}
              />
              {props.error ? <div className="status-alert status-alert--error module-join-modal__error">{props.error}</div> : null}
            </>
          )}
        </div>
        <div className="modal__footer module-join-modal__footer ui-row ui-row--end">
          <Button type="button" variant="ghost" onClick={props.onClose} disabled={props.status === "submitting"}>
            {props.status === "success" ? "Close" : "Cancel"}
          </Button>
          {props.status !== "success" ? (
            <Button type="button" onClick={props.onSubmit} disabled={props.status === "submitting"}>
              {props.status === "submitting" ? "Joining..." : "Join module"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
