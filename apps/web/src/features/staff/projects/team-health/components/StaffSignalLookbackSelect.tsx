"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type StaffSignalLookbackSelectProps = {
  value: "7" | "14" | "30" | "all";
};

export function StaffSignalLookbackSelect({ value }: StaffSignalLookbackSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lookback", nextValue);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <select
      aria-label="Signal lookback window"
      className="staff-projects__signal-lookback-select"
      value={value}
      onChange={(event) => handleChange(event.currentTarget.value)}
    >
      <option value="7">Last 7 days</option>
      <option value="14">Last 14 days</option>
      <option value="30">Last 30 days</option>
      <option value="all">All time</option>
    </select>
  );
}

