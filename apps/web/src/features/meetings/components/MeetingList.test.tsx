import { render, screen } from "@testing-library/react";
import { MeetingList } from "./MeetingList";

const pastDate = "2025-01-01T10:00:00Z";
const futureDate = "2099-01-01T10:00:00Z";

const meetings = [
  {
    id: 1,
    title: "Team Meeting",
    date: pastDate,
    organiser: { id: 1, firstName: "Reggie", lastName: "King" },
    location: "Bush House 3.01",
    videoCallLink: null,
  },
  {
    id: 2,
    title: "Group Check-in",
    date: futureDate,
    organiser: { id: 2, firstName: "John", lastName: "Smith" },
    location: null,
    videoCallLink: "https://meet.google.com/abc-defg-hij",
  },
];

describe("MeetingList", () => {
  it("renders meeting titles", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText("Group Check-in")).toBeInTheDocument();
  });

  it("renders organiser names", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByText("Reggie King")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  it("renders location when present", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByText("Bush House 3.01")).toBeInTheDocument();
  });

  it("renders view link for each meeting", () => {
    render(<MeetingList meetings={meetings as any} projectId={5} />);
    const viewLinks = screen.getAllByRole("link", { name: /view meeting/i });
    expect(viewLinks).toHaveLength(2);
    expect(viewLinks[0]).toHaveAttribute("href", "/projects/5/meetings/1");
    expect(viewLinks[1]).toHaveAttribute("href", "/projects/5/meetings/2");
  });

  it("shows join link for upcoming meetings with a video call link", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByRole("link", { name: /join video call/i })).toBeInTheDocument();
  });

  it("does not show join link for past meetings", () => {
    const pastWithLink = [{ ...meetings[0], videoCallLink: "https://meet.google.com/abc" }];
    render(<MeetingList meetings={pastWithLink as any} projectId={1} />);
    expect(screen.queryByRole("link", { name: /join video call/i })).not.toBeInTheDocument();
  });

  it("does not show join link for upcoming meetings without a video call link", () => {
    const upcomingNoLink = [{ ...meetings[1], videoCallLink: null }];
    render(<MeetingList meetings={upcomingNoLink as any} projectId={1} />);
    expect(screen.queryByRole("link", { name: /join video call/i })).not.toBeInTheDocument();
  });

  it("renders empty message when no meetings", () => {
    render(<MeetingList meetings={[]} projectId={1} emptyMessage="No meetings yet." />);
    expect(screen.getByText("No meetings yet.")).toBeInTheDocument();
  });
});
