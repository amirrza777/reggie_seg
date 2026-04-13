/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from "next";
import { MarketingLayout } from "@/marketing/layouts/marketing";
import "../styles/global-marketing.css";

export const metadata: Metadata = {
  title: "System Status — Team Feedback",
};

type ServiceStatus = "operational" | "degraded" | "outage";

const services: { name: string; status: ServiceStatus; detail: string }[] = [
  { name: "Web Application", status: "operational", detail: "All routes responding normally." },
  { name: "API", status: "operational", detail: "Request latency within normal range." },
  { name: "Authentication", status: "operational", detail: "Login and session management normal." },
  { name: "Email Notifications", status: "operational", detail: "Delivery pipeline healthy." },
  { name: "GitHub Integration", status: "operational", detail: "Repository sync working." },
  { name: "Trello Integration", status: "operational", detail: "Board sync working." },
];

const statusLabel: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded: "Degraded performance",
  outage: "Outage",
};

export default function StatusPage() {
  const allOperational = services.every((s) => s.status === "operational");

  return (
    <MarketingLayout>
      <div className="legal-page">
        <div className="legal-page__container">
          <header className="legal-page__header">
            <p className="eyebrow">Platform</p>
            <h1>System Status</h1>
            <p className="lede">Current health of Team Feedback services.</p>
          </header>

          <div
            className={`status-page__overall ${allOperational ? "status-page__overall--ok" : "status-page__overall--issue"}`}
          >
            <span className="status-page__overall-dot" aria-hidden="true" />
            <strong>{allOperational ? "All systems operational" : "Some systems affected"}</strong>
          </div>

          <div className="legal-page__body">
            <section className="legal-page__section">
              <h2>Services</h2>
              <div className="status-page__list">
                {services.map((service) => (
                  <div key={service.name} className="status-page__item">
                    <div className="status-page__item-info">
                      <p className="status-page__item-name">{service.name}</p>
                      <p className="status-page__item-detail muted">{service.detail}</p>
                    </div>
                    <span className={`status-page__badge status-page__badge--${service.status}`}>
                      {statusLabel[service.status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="legal-page__section">
              <h2>Recent Incidents</h2>
              <p className="muted">No incidents reported in the last 30 days.</p>
            </section>

            <section className="legal-page__section">
              <h2>Scheduled Maintenance</h2>
              <p className="muted">No scheduled maintenance windows at this time.</p>
            </section>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
