import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const editorUpdateMock = vi.fn((fn: () => void) => fn());
const replaceMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [{ update: editorUpdateMock }],
}));

vi.mock("./MentionNode", () => ({
  $createMentionNode: (name: string) => ({
    name,
    select: selectMock,
    replace: replaceMock,
  }),
}));

let capturedProps: any = null;

vi.mock("@lexical/react/LexicalTypeaheadMenuPlugin", () => ({
  LexicalTypeaheadMenuPlugin: (props: any) => {
    capturedProps = props;
    return null;
  },
  MenuOption: class {
    key: string;
    ref: { current: null };
    constructor(key: string) {
      this.key = key;
      this.ref = { current: null };
    }
    setRefElement = vi.fn();
  },
  useBasicTypeaheadTriggerMatch: vi.fn(() => vi.fn()),
}));

import { MentionPlugin } from "./MentionPlugin";

const members = [
  { id: 1, firstName: "Reggie", lastName: "King", projectRole: "Module Lead" },
  { id: 2, firstName: "Alex", lastName: "Smith" },
  { id: 3, firstName: "Bob", lastName: "Jones", projectRole: "Teaching Assistant" },
];

beforeEach(() => {
  capturedProps = null;
  editorUpdateMock.mockClear();
  replaceMock.mockClear();
  selectMock.mockClear();
});

describe("MentionPlugin", () => {
  it("renders without crashing", () => {
    render(<MentionPlugin members={members} />);
    expect(capturedProps).not.toBeNull();
  });

  it("creates options from members", () => {
    render(<MentionPlugin members={members} />);

    expect(capturedProps.options).toHaveLength(3);
    expect(capturedProps.options[0].name).toBe("Reggie King");
    expect(capturedProps.options[1].name).toBe("Alex Smith");
    expect(capturedProps.options[2].name).toBe("Bob Jones");
  });

  it("stores member id and project role on options", () => {
    render(<MentionPlugin members={members} />);

    expect(capturedProps.options[0].memberId).toBe(1);
    expect(capturedProps.options[0].projectRole).toBe("Module Lead");
    expect(capturedProps.options[1].projectRole).toBeUndefined();
  });

  it("filters options by query", () => {
    render(<MentionPlugin members={members} />);

    act(() => { capturedProps.onQueryChange("reg"); });

    expect(capturedProps.options).toHaveLength(1);
    expect(capturedProps.options[0].name).toBe("Reggie King");
  });

  it("filters case-insensitively", () => {
    render(<MentionPlugin members={members} />);

    act(() => { capturedProps.onQueryChange("SMITH"); });

    expect(capturedProps.options).toHaveLength(1);
    expect(capturedProps.options[0].name).toBe("Alex Smith");
  });

  it("shows all options when query is null", () => {
    render(<MentionPlugin members={members} />);

    act(() => { capturedProps.onQueryChange(null); });

    expect(capturedProps.options).toHaveLength(3);
  });

  it("handles undefined members", () => {
    render(<MentionPlugin />);

    expect(capturedProps.options).toHaveLength(0);
  });

  it("replaces node and closes menu on select", () => {
    render(<MentionPlugin members={members} />);

    const closeMenu = vi.fn();
    const nodeToReplace = { replace: replaceMock };
    capturedProps.onSelectOption(capturedProps.options[0], nodeToReplace, closeMenu);

    expect(editorUpdateMock).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalled();
    expect(closeMenu).toHaveBeenCalled();
  });

  it("skips replace when nodeToReplace is null", () => {
    render(<MentionPlugin members={members} />);

    const closeMenu = vi.fn();
    capturedProps.onSelectOption(capturedProps.options[0], null, closeMenu);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalled();
    expect(closeMenu).toHaveBeenCalled();
  });

  it("returns null from menuRenderFn when options are empty", () => {
    render(<MentionPlugin />);

    const anchorRef = { current: document.createElement("div") };
    const result = capturedProps.menuRenderFn(anchorRef, {
      selectedIndex: 0,
      selectOptionAndCleanUp: vi.fn(),
      setHighlightedIndex: vi.fn(),
    });

    expect(result).toBeNull();
  });

  it("returns null from menuRenderFn when anchor is null", () => {
    render(<MentionPlugin members={members} />);

    const anchorRef = { current: null };
    const result = capturedProps.menuRenderFn(anchorRef, {
      selectedIndex: 0,
      selectOptionAndCleanUp: vi.fn(),
      setHighlightedIndex: vi.fn(),
    });

    expect(result).toBeNull();
  });

  it("renders dropdown with member names", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(<MentionPlugin members={members} />);

    const portal = capturedProps.menuRenderFn({ current: container }, {
      selectedIndex: -1,
      selectOptionAndCleanUp: vi.fn(),
      setHighlightedIndex: vi.fn(),
    });

    render(portal);

    expect(screen.getByText("Reggie King")).toBeInTheDocument();
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();

    document.body.removeChild(container);
  });

  it("renders project role when present", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(<MentionPlugin members={members} />);

    const portal = capturedProps.menuRenderFn({ current: container }, {
      selectedIndex: -1,
      selectOptionAndCleanUp: vi.fn(),
      setHighlightedIndex: vi.fn(),
    });

    render(portal);

    expect(screen.getByText("Module Lead")).toBeInTheDocument();
    expect(screen.getByText("Teaching Assistant")).toBeInTheDocument();

    document.body.removeChild(container);
  });

  it("applies active class to selected option", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(<MentionPlugin members={members} />);

    const portal = capturedProps.menuRenderFn({ current: container }, {
      selectedIndex: 1,
      selectOptionAndCleanUp: vi.fn(),
      setHighlightedIndex: vi.fn(),
    });

    render(portal);

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[1].className).toContain("mention-dropdown__item--active");

    document.body.removeChild(container);
  });

  it("calls selectOptionAndCleanUp on option click", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(<MentionPlugin members={members} />);

    const selectOptionAndCleanUp = vi.fn();
    const portal = capturedProps.menuRenderFn({ current: container }, {
      selectedIndex: -1,
      selectOptionAndCleanUp,
      setHighlightedIndex: vi.fn(),
    });

    render(portal);

    fireEvent.click(screen.getByText("Alex Smith"));
    expect(selectOptionAndCleanUp).toHaveBeenCalledWith(capturedProps.options[1]);

    document.body.removeChild(container);
  });

  it("calls setHighlightedIndex on mouse enter", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(<MentionPlugin members={members} />);

    const setHighlightedIndex = vi.fn();
    const portal = capturedProps.menuRenderFn({ current: container }, {
      selectedIndex: -1,
      selectOptionAndCleanUp: vi.fn(),
      setHighlightedIndex,
    });

    render(portal);

    fireEvent.mouseEnter(screen.getByText("Bob Jones"));
    expect(setHighlightedIndex).toHaveBeenCalledWith(2);

    document.body.removeChild(container);
  });
});
