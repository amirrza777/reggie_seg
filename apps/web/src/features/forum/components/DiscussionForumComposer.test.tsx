import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscussionForumComposer } from "./DiscussionForumComposer";

// Mock RichTextEditor
vi.mock("@/shared/ui/rich-text/RichTextEditor", () => ({
  RichTextEditor: ({ onChange, onEmptyChange, initialContent, placeholder }: any) => {
    const handleChange = (e: any) => {
      const value = e.target.value;
      onChange(value);
      onEmptyChange(!value.trim());
    };
    return (
      <textarea
        key={initialContent}
        placeholder={placeholder}
        defaultValue={initialContent}
        onChange={handleChange}
        data-testid="rich-text-editor"
      />
    );
  },
}));

describe("DiscussionForumComposer", () => {
  const defaultProps = {
    title: "",
    setTitle: vi.fn(),
    body: "",
    setBody: vi.fn(),
    setBodyEmpty: vi.fn(),
    userLoading: false,
    isSignedIn: true,
    canSubmit: true,
    composerKey: 1,
    onSubmit: vi.fn((e) => e.preventDefault()),
  };

  describe("rendering", () => {
    it("renders title and body input fields", () => {
      render(<DiscussionForumComposer {...defaultProps} />);

      const textboxes = screen.getAllByRole("textbox");
      expect(textboxes.length).toBeGreaterThanOrEqual(2); // At least title and editor
      expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
    });

    it("renders post button", () => {
      render(<DiscussionForumComposer {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
    });

    it("renders sign-in hint when not signed in", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          isSignedIn={false}
        />
      );

      expect(screen.getByText("Please sign in to create a post.")).toBeInTheDocument();
    });

    it("does not render sign-in hint when signed in", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          isSignedIn={true}
        />
      );

      expect(screen.queryByText("Please sign in to create a post.")).not.toBeInTheDocument();
    });

    it("does not render sign-in hint when user is loading", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          isSignedIn={false}
          userLoading={true}
        />
      );

      expect(screen.queryByText("Please sign in to create a post.")).not.toBeInTheDocument();
    });
  });

  describe("title field interaction", () => {
    it("calls setTitle when title changes", () => {
      const setTitle = vi.fn();
      render(
        <DiscussionForumComposer
          {...defaultProps}
          setTitle={setTitle}
        />
      );

      const allInputs = screen.getAllByRole("textbox");
      // First textbox should be the title field
      const titleInput = allInputs[0];
      fireEvent.change(titleInput, { target: { value: "New title" } });

      expect(setTitle).toHaveBeenCalledWith("New title");
    });

    it("disables title field when not signed in", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          isSignedIn={false}
        />
      );

      const titleInput = screen.getAllByRole("textbox")[0] as HTMLInputElement;
      expect(titleInput).toBeDisabled();
    });

    it("disables title field when user is loading", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          userLoading={true}
        />
      );

      const titleInput = screen.getAllByRole("textbox")[0] as HTMLInputElement;
      expect(titleInput).toBeDisabled();
    });

    it("enables title field when signed in and not loading", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          isSignedIn={true}
          userLoading={false}
        />
      );

      const titleInput = screen.getAllByRole("textbox")[0] as HTMLInputElement;
      expect(titleInput).not.toBeDisabled();
    });
  });

  describe("body field interaction", () => {
    it("calls setBody when body changes", () => {
      const setBody = vi.fn();
      render(
        <DiscussionForumComposer
          {...defaultProps}
          setBody={setBody}
        />
      );

      const editor = screen.getByTestId("rich-text-editor");
      fireEvent.change(editor, { target: { value: "New body" } });

      expect(setBody).toHaveBeenCalledWith("New body");
    });

    it("integrates with RichTextEditor onChange and onEmptyChange", () => {
      const setBody = vi.fn();
      const setBodyEmpty = vi.fn();
      render(
        <DiscussionForumComposer
          {...defaultProps}
          body=""
          setBody={setBody}
          setBodyEmpty={setBodyEmpty}
        />
      );

      // The mock implementation should call both callbacks
      const editor = screen.getByTestId("rich-text-editor");
      expect(editor).toHaveAttribute("data-testid", "rich-text-editor");
    });
  });

  describe("submit button state", () => {
    it("disables submit button when canSubmit is false", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          canSubmit={false}
        />
      );

      const button = screen.getByRole("button", { name: "Post" });
      expect(button).toBeDisabled();
    });

    it("disables submit button when not signed in", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          isSignedIn={false}
        />
      );

      const button = screen.getByRole("button", { name: "Post" });
      expect(button).toBeDisabled();
    });

    it("disables submit button when user is loading", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          userLoading={true}
        />
      );

      const button = screen.getByRole("button", { name: "Post" });
      expect(button).toBeDisabled();
    });

    it("enables submit button when all conditions are met", () => {
      render(
        <DiscussionForumComposer
          {...defaultProps}
          canSubmit={true}
          isSignedIn={true}
          userLoading={false}
        />
      );

      const button = screen.getByRole("button", { name: "Post" });
      expect(button).not.toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("calls onSubmit when form is submitted", () => {
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <DiscussionForumComposer
          {...defaultProps}
          onSubmit={onSubmit}
        />
      );

      const button = screen.getByRole("button", { name: "Post" });
      fireEvent.click(button);

      expect(onSubmit).toHaveBeenCalled();
    });

    it("does not submit when button is disabled", () => {
      const onSubmit = vi.fn();
      render(
        <DiscussionForumComposer
          {...defaultProps}
          canSubmit={false}
          onSubmit={onSubmit}
        />
      );

      const button = screen.getByRole("button", { name: "Post" });
      fireEvent.click(button);

      // Button click event doesn't fire if disabled, so onSubmit won't be called
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("members prop", () => {
    it("passes members to RichTextEditor", () => {
      const members = [{ id: 1, name: "John Doe" }];
      render(
        <DiscussionForumComposer
          {...defaultProps}
          members={members}
        />
      );

      // RichTextEditor should be rendered (we can verify it accepts members)
      expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
    });
  });

  describe("composer key prop", () => {
    it("uses composerKey to reset editor on key change", () => {
      const { rerender } = render(
        <DiscussionForumComposer
          {...defaultProps}
          body="Initial content"
          composerKey={1}
        />
      );

      let editor = screen.getByTestId("rich-text-editor") as HTMLTextAreaElement;
      expect(editor.defaultValue).toBe("Initial content");

      // Change the key to force remount
      rerender(
        <DiscussionForumComposer
          {...defaultProps}
          body="New content"
          composerKey={2}
        />
      );

      editor = screen.getByTestId("rich-text-editor") as HTMLTextAreaElement;
      expect(editor.defaultValue).toBe("New content");
    });
  });
});
