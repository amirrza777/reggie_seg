import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("../api/client", () => ({
  addComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock("./CommentInput", () => ({
  CommentInput: ({ onPost }: { onPost: (text: string) => Promise<void> }) => {
    const [value, setValue] = useState("");
    const [posting, setPosting] = useState(false);
    return (
      <div>
        <input
          placeholder="Add a comment"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button
          type="button"
          disabled={posting || !value.trim()}
          onClick={async () => {
            if (!value.trim()) return;
            setPosting(true);
            try {
              await onPost(value.trim());
              setValue("");
            } finally {
              setPosting(false);
            }
          }}
        >
          {posting ? "Posting..." : "Post Comment"}
        </button>
      </div>
    );
  },
}));

import { useUser } from "@/features/auth/useUser";
import { addComment, deleteComment } from "../api/client";
import { CommentSection } from "./CommentSection";

const useUserMock = useUser as MockedFunction<typeof useUser>;
const addCommentMock = addComment as MockedFunction<typeof addComment>;
const deleteCommentMock = deleteComment as MockedFunction<typeof deleteComment>;

const currentUser = { id: 1, firstName: "Reggie", lastName: "King" };

const comments = [
  {
    id: 101,
    meetingId: 10,
    userId: 1,
    content: "Looks good",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
    user: { id: 1, firstName: "Reggie", lastName: "King" },
  },
  {
    id: 102,
    meetingId: 10,
    userId: 2,
    content: "Agreed",
    createdAt: "2026-03-01T11:00:00Z",
    updatedAt: "2026-03-01T11:00:00Z",
    user: { id: 2, firstName: "John", lastName: "Smith" },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  useUserMock.mockReturnValue({ user: currentUser } as ReturnType<typeof useUser>);
  addCommentMock.mockResolvedValue(undefined);
  deleteCommentMock.mockResolvedValue(undefined);
});

describe("CommentSection", () => {
  it("renders existing comments", () => {
    render(<CommentSection meetingId={10} initialComments={comments} />);
    expect(screen.getByText("Looks good")).toBeInTheDocument();
    expect(screen.getByText("Agreed")).toBeInTheDocument();
    expect(screen.getByText("Reggie King")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  it("shows empty state when no comments", () => {
    render(<CommentSection meetingId={10} initialComments={[]} />);
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it("shows delete button only for own comments", () => {
    render(<CommentSection meetingId={10} initialComments={comments} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons).toHaveLength(1);
  });

  it("hides comment form when no user is logged in", () => {
    useUserMock.mockReturnValue({ user: null } as ReturnType<typeof useUser>);
    render(<CommentSection meetingId={10} initialComments={comments} />);
    expect(screen.queryByPlaceholderText(/add a comment/i)).not.toBeInTheDocument();
  });

  it("disables post button when textarea is empty", () => {
    render(<CommentSection meetingId={10} initialComments={[]} />);
    expect(screen.getByRole("button", { name: /post comment/i })).toBeDisabled();
  });

  it("adds a comment and clears textarea", async () => {
    render(<CommentSection meetingId={10} initialComments={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), { target: { value: "Nice work" } });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));
    await waitFor(() => expect(addCommentMock).toHaveBeenCalledWith(10, 1, "Nice work"));
    expect(screen.getByText("Nice work")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add a comment/i)).toHaveValue("");
  });

  it("does not post when textarea is only whitespace", () => {
    render(<CommentSection meetingId={10} initialComments={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /post comment/i })).toBeDisabled();
  });

  it("shows error message when adding comment fails", async () => {
    addCommentMock.mockRejectedValue(new Error("Network error"));
    render(<CommentSection meetingId={10} initialComments={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));
    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
  });

  it("shows fallback error for non-Error rejection when adding", async () => {
    addCommentMock.mockRejectedValue("unknown");
    render(<CommentSection meetingId={10} initialComments={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));
    await waitFor(() => expect(screen.getByText(/failed to post comment/i)).toBeInTheDocument());
  });

  it("deletes a comment", async () => {
    render(<CommentSection meetingId={10} initialComments={comments} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(deleteCommentMock).toHaveBeenCalledWith(101));
    expect(screen.queryByText("Looks good")).not.toBeInTheDocument();
  });

  it("shows error message when deleting comment fails", async () => {
    deleteCommentMock.mockRejectedValue(new Error("Delete failed"));
    render(<CommentSection meetingId={10} initialComments={comments} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(screen.getByText(/delete failed/i)).toBeInTheDocument());
  });

  it("shows fallback error for non-Error rejection when deleting", async () => {
    deleteCommentMock.mockRejectedValue("unknown");
    render(<CommentSection meetingId={10} initialComments={comments} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(screen.getByText(/failed to delete comment/i)).toBeInTheDocument());
  });

  it("highlights mentions in comment content with mention-node class", () => {
    const withMention = [{ ...comments[0], content: "@Alice Smith go team!" }];
    render(<CommentSection meetingId={10} initialComments={withMention} />);
    const mention = screen.getByText("@Alice Smith");
    expect(mention.tagName).toBe("SPAN");
    expect(mention).toHaveClass("mention-node");
  });

  it("renders plain text without mention spans when no mentions present", () => {
    render(<CommentSection meetingId={10} initialComments={comments} />);
    const body = screen.getByText("Looks good");
    expect(body.tagName).not.toBe("SPAN");
  });

  it("disables post button while posting", async () => {
    let resolve: () => void;
    addCommentMock.mockReturnValue(new Promise((r) => { resolve = r as () => void; }));
    render(<CommentSection meetingId={10} initialComments={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));
    expect(screen.getByRole("button", { name: /posting/i })).toBeDisabled();
    resolve!();
    await waitFor(() => expect(screen.getByText("Test")).toBeInTheDocument());
  });
});
