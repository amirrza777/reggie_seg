import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { MeetingList } from "./MeetingList";

const meetings = [
  {
    id: 1,
    title: "Team Meeting",
    date: "2026-03-01T10:00:00Z",
    organiser: { id: 1, firstName: "Reggie", lastName: "King" },
    location: "Bush House 3.01",
  },
  {
    id: 2,
    title: "Group Check-in",
    date: "2026-03-05T14:00:00Z",
    organiser: { id: 2, firstName: "John", lastName: "Smith" },
    location: null,
  },
];

describe("MeetingList", () => {
  it("renders meeting titles", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} onCreateNew={vi.fn()} />);
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText("Group Check-in")).toBeInTheDocument();
  });

  it("renders organiser names", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} onCreateNew={vi.fn()} />);
    expect(screen.getByText("Reggie King")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  it("renders location or empty string", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} onCreateNew={vi.fn()} />);
    expect(screen.getByText("Bush House 3.01")).toBeInTheDocument();
  });

  it("calls onCreateNew when button is clicked", () => {
    const onCreateNew = vi.fn();
    render(<MeetingList meetings={meetings as any} projectId={1} onCreateNew={onCreateNew} />);
    fireEvent.click(screen.getByRole("button", { name: /new meeting/i }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("links to correct meeting detail page", () => {
    render(<MeetingList meetings={meetings as any} projectId={5} onCreateNew={vi.fn()} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/projects/5/meetings/1");
    expect(links[1]).toHaveAttribute("href", "/projects/5/meetings/2");
  });
});
