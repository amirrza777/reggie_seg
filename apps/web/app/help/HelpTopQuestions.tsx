"use client";

import Link from "next/link";

const topQuestions = [
  { id: "reset-password", label: "Reset password", href: "/help/account-access" },
  {
    id: "find-meeting-schedules",
    label: "Find meeting schedules",
    href: "/help/faqs?q=meeting&open=How%20do%20I%20view%20my%20team%27s%20meeting%20schedule%3F",
  },
  {
    id: "complete-peer-assessment",
    label: "Complete peer assessment",
    href: "/help/faqs?q=peer%20assessment&open=Where%20do%20I%20see%20my%20peer%20assessment%3F",
  },
  { id: "check-my-role", label: "Check my role", href: "/help/roles-permissions" },
];

export function HelpTopQuestions() {
  return (
    <section className="help-hub__tasks" aria-label="Top tasks">
      <h3>Top questions</h3>
      <div className="help-hub__tasks-grid">
        {topQuestions.map((question) => (
          <Link
            key={question.id}
            href={question.href}
            className="link-ghost"
          >
            {question.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
