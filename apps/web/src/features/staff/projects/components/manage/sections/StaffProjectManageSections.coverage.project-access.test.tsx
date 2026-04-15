import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/errors";
import {
  buildInitial,
  largeModuleDirectory,
  patchMock,
  StaffProjectManageProjectAccessSection,
  withProvider,
} from "./StaffProjectManageSections.coverage.shared";

describe("StaffProjectManageProjectAccessSection coverage", () => {
  it("invokes search and pagination prop callbacks wired from the access section", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageProjectAccessSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /access-props-smoke/i }));
  });

  it("shows staff summaries and module links", () => {
    const initial = buildInitial({
      projectAccess: {
        ...buildInitial().projectAccess,
        moduleLeaders: [{ id: 42, email: "", firstName: "", lastName: "" }],
      },
    });
    render(withProvider(<StaffProjectManageProjectAccessSection />, initial));
    expect(screen.getByText(/user 42/i)).toBeInTheDocument();
    expect(screen.getByText(/none assigned on this module/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit staff access/i })).toHaveAttribute("href", "/staff/modules/99/manage");
  });

  it("adds a student, saves, and shows enrollment link in review", async () => {
    const user = userEvent.setup();
    const initial = buildInitial();
    render(withProvider(<StaffProjectManageProjectAccessSection />, initial));
    await user.click(screen.getByRole("checkbox", { name: /access-11/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText(/adding \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("Ben Beta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open module student enrollment/i })).toHaveAttribute(
      "href",
      "/staff/modules/99/students/access",
    );

    patchMock.mockResolvedValueOnce({ ...initial, projectAccess: { ...initial.projectAccess, projectStudentIds: [10, 11] } });
    await user.click(screen.getByRole("button", { name: /save project access/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, { projectStudentIds: [10, 11] }));
    expect(await screen.findByText(/project access saved/i)).toBeInTheDocument();
  });

  it("removes a baseline student from the project", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({
      projectAccess: {
        ...buildInitial().projectAccess,
        projectStudentIds: [10, 11],
      },
    });
    render(withProvider(<StaffProjectManageProjectAccessSection />, initial));
    await user.click(screen.getByRole("checkbox", { name: /access-11/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText(/removing \(1\)/i)).toBeInTheDocument();
  });

  it("shows no student access changes on review when selection matches baseline", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageProjectAccessSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText(/no changes to project student access/i)).toBeInTheDocument();
  });

  it("surfaces API and generic errors when saving access", async () => {
    const user = userEvent.setup();
    const initial = buildInitial();
    render(withProvider(<StaffProjectManageProjectAccessSection />, initial));
    await user.click(screen.getByRole("checkbox", { name: /access-11/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    patchMock.mockRejectedValueOnce(new ApiError("denied"));
    await user.click(screen.getByRole("button", { name: /save project access/i }));
    expect(await screen.findByText("denied")).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new Error("x"));
    await user.click(screen.getByRole("button", { name: /save project access/i }));
    expect(await screen.findByText(/could not save project access/i)).toBeInTheDocument();
  });

  it("returns to editing from review and toggles hide filter", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageProjectAccessSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    await user.click(screen.getByRole("button", { name: /back to editing/i }));
    await user.click(screen.getByRole("button", { name: /toggle-hide-already-on-project/i }));
  });

  it("shows User id fallback when an id is missing from the directory map", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageProjectAccessSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /raw-toggle-unknown/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText("User 999")).toBeInTheDocument();
  });

  it("shows User id fallback for removals not present in the directory map", async () => {
    const user = userEvent.setup();
    render(
      withProvider(
        <StaffProjectManageProjectAccessSection />,
        buildInitial({
          projectAccess: {
            ...buildInitial().projectAccess,
            projectStudentIds: [10, 11, 888],
          },
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: /raw-toggle-ghost/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText(/removing \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("User 888")).toBeInTheDocument();
  });

  it("invokes student list pagination controls", async () => {
    const user = userEvent.setup();
    const directory = largeModuleDirectory(25);
    render(
      withProvider(
        <StaffProjectManageProjectAccessSection />,
        buildInitial({
          projectAccess: {
            ...buildInitial().projectAccess,
            moduleMemberDirectory: directory,
            projectStudentIds: [200],
          },
        }),
      ),
    );
    expect(screen.getByLabelText("student-total-pages")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: /student-next-page/i }));
    expect(screen.getByLabelText("student-page")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: /student-next-page/i }));
    expect(screen.getByLabelText("student-page")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: /student-previous-page/i }));
    expect(screen.getByLabelText("student-page")).toHaveTextContent("1");
  });
});
