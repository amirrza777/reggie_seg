"use client";

import Link from "next/link";

const topQuestions = [
  {
    id: "reset-password",
    label: "Reset password",
    detail: "Recover access and sign in again.",
    href: "/help/account-access",
  },
  {
    id: "find-meeting-schedules",
    label: "Find meeting schedules",
    detail: "Jump to the schedule FAQ and open the answer.",
    href: "/help/faqs?q=meeting&open=How%20do%20I%20view%20my%20team%27s%20meeting%20schedule%3F",
  },
  {
    id: "complete-peer-assessment",
    label: "Complete peer assessment",
    detail: "Open peer assessment guidance from the knowledge base.",
    href: "/help/faqs?q=peer%20assessment&open=Where%20do%20I%20see%20my%20peer%20assessment%3F",
  },
  {
    id: "check-my-role",
    label: "Check my role",
    detail: "Understand what your account can access.",
    href: "/help/roles-permissions",
  },
];

export function HelpTopQuestions() {
  return (
    <section className="help-hub__tasks" aria-label="Top tasks">
      <h3>Top questions</h3>
      <div className="help-hub__tasks-grid">
        {topQuestions.map((question) => (
          <Link key={question.id} href={question.href} className="help-hub__task-link">
            <span className="help-hub__task-title">{question.label}</span>
            <span className="help-hub__task-detail">{question.detail}</span>
            <span className="help-hub__task-action">Open</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
