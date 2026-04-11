import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StaffProjectManageDangerZone } from "./StaffProjectManageDangerZone";

describe("StaffProjectManageDangerZone", () => {
  it("fires onAction when enabled and shows pending label", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { rerender } = render(
      <StaffProjectManageDangerZone
        title="Test"
        description="Desc"
        confirmInputId="c1"
        confirmChecked
        onConfirmChange={vi.fn()}
        confirmDisabled={false}
        confirmLabel="OK"
        actionLabel="Go"
        actionPendingLabel="Wait"
        isActionPending={false}
        onAction={onAction}
        actionDisabled={false}
        buttonVariant="primary"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(onAction).toHaveBeenCalled();

    rerender(
      <StaffProjectManageDangerZone
        title="Test"
        description="Desc"
        confirmInputId="c1"
        confirmChecked
        onConfirmChange={vi.fn()}
        confirmDisabled={false}
        confirmLabel="OK"
        actionLabel="Go"
        actionPendingLabel="Wait"
        isActionPending
        onAction={onAction}
        actionDisabled={false}
        buttonVariant="primary"
      />,
    );
    expect(screen.getByRole("button", { name: "Wait" })).toBeInTheDocument();
  });
});
