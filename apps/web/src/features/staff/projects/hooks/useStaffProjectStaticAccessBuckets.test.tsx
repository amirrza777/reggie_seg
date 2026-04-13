import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StaffProjectManageAccessPerson } from "@/features/projects/types";
import { useStaffProjectStaticAccessBuckets } from "./useStaffProjectStaticAccessBuckets";

function person(id: number, lastName: string): StaffProjectManageAccessPerson {
  return { id, email: `u${id}@x.com`, firstName: "F", lastName };
}

const smallDirectory: StaffProjectManageAccessPerson[] = [
  person(3, "Gamma"),
  person(1, "Alpha"),
  person(2, "Beta"),
];

describe("useStaffProjectStaticAccessBuckets", () => {
  it("orders by priority ids first then alphabetical", () => {
    const options = {
      prioritiseUserIds: [2],
      hideAlreadySelectedForProject: false,
      selectedProjectStudentIds: new Set<number>(),
    };
    const { result } = renderHook(() => useStaffProjectStaticAccessBuckets(smallDirectory, options));
    expect(result.current.studentUsers.map((u) => u.id)).toEqual([2, 1, 3]);
    expect(result.current.studentStatus).toBe("success");
    expect(result.current.studentTotal).toBe(3);
  });

  it("filters by search query", () => {
    const options = {
      prioritiseUserIds: [] as number[],
      hideAlreadySelectedForProject: false,
      selectedProjectStudentIds: new Set<number>(),
    };
    const { result } = renderHook(() => useStaffProjectStaticAccessBuckets(smallDirectory, options));
    act(() => {
      result.current.setStudentSearchQuery("gamma");
    });
    expect(result.current.studentTotal).toBe(1);
    expect(result.current.studentUsers[0]?.id).toBe(3);
  });

  it("hides ids in selectedProjectStudentIds when enabled", () => {
    const options = {
      prioritiseUserIds: [] as number[],
      hideAlreadySelectedForProject: true,
      selectedProjectStudentIds: new Set([1, 2]),
    };
    const { result } = renderHook(() => useStaffProjectStaticAccessBuckets(smallDirectory, options));
    expect(result.current.studentTotal).toBe(1);
    expect(result.current.studentUsers[0]?.id).toBe(3);
  });

  it("paginates and applies page input", () => {
    const directory: StaffProjectManageAccessPerson[] = Array.from({ length: 25 }, (_, i) =>
      person(100 + i, `L${i}`),
    );
    const options = {
      prioritiseUserIds: [100],
      hideAlreadySelectedForProject: false,
      selectedProjectStudentIds: new Set<number>(),
    };
    const { result } = renderHook(() => useStaffProjectStaticAccessBuckets(directory, options));
    expect(result.current.studentTotalPages).toBe(2);
    expect(result.current.studentUsers).toHaveLength(20);
    act(() => {
      result.current.setStudentPage(2);
    });
    expect(result.current.studentUsers).toHaveLength(5);
    act(() => {
      result.current.setStudentPageInput("99");
      result.current.applyStudentPageInput("99");
    });
    expect(result.current.studentPageInput).toBe("2");
    act(() => {
      result.current.setStudentPageInput("2");
      result.current.applyStudentPageInput("2");
    });
    expect(result.current.studentPage).toBe(2);
  });

  it("resets to page 1 when filters or directory change", () => {
    const emptySet = new Set<number>();
    const optsA = {
      prioritiseUserIds: [] as number[],
      hideAlreadySelectedForProject: false,
      selectedProjectStudentIds: emptySet,
    };
    const optsB = {
      prioritiseUserIds: [1],
      hideAlreadySelectedForProject: false,
      selectedProjectStudentIds: emptySet,
    };
    const { result, rerender } = renderHook(
      ({
        directory,
        options,
      }: {
        directory: StaffProjectManageAccessPerson[];
        options: Parameters<typeof useStaffProjectStaticAccessBuckets>[1];
      }) => useStaffProjectStaticAccessBuckets(directory, options),
      { initialProps: { directory: smallDirectory, options: optsA } },
    );
    act(() => {
      result.current.setStudentSearchQuery("a");
    });
    expect(result.current.studentPage).toBe(1);
    rerender({ directory: smallDirectory, options: optsB });
    expect(result.current.studentPage).toBe(1);
  });
});
