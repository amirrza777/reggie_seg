'use client';

import { Button } from "@/shared/ui/Button";
import { GoogleIcon } from "@/shared/ui/GoogleIcon";

type GoogleAuthButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function GoogleAuthButton({ onClick, disabled }: GoogleAuthButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="auth-button auth-button--google"
      onClick={onClick}
      disabled={disabled}
      style={{ justifyContent: "center" }}
    >
      <GoogleIcon />
      Continue with Google
    </Button>
  );
}
