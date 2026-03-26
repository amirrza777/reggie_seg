/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Team Feedback",
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-page__container">
        <header className="legal-page__header">
          <p className="eyebrow">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="lede">
            How we collect, use, and protect your data when you use Team Feedback.
          </p>
          <p className="legal-page__meta">Last updated: January 2025</p>
        </header>

        <div className="legal-page__notice" role="note">
          <strong>Placeholder document.</strong> This is sample text written for development purposes
          and is not a legally binding privacy policy. Replace this content with your actual privacy
          policy before going live.
        </div>

        <div className="legal-page__body">
          <section className="legal-page__section">
            <h2>1. Information We Collect</h2>
            <p>
              Team Feedback collects information you provide directly when you register for an
              account, create or join a module, and use features of the platform. This includes:
            </p>
            <ul>
              <li>
                <strong>Account information</strong> — your name, email address, and password
                (stored as a secure hash).
              </li>
              <li>
                <strong>Profile data</strong> — any optional profile details you choose to add,
                such as a display name or role affiliation.
              </li>
              <li>
                <strong>Content you submit</strong> — peer assessments, questionnaire responses,
                meeting notes, and discussion posts you create within the platform.
              </li>
              <li>
                <strong>Usage data</strong> — pages visited, features used, and actions taken
                within Team Feedback, collected to help us improve the service.
              </li>
            </ul>

            <h3>Third-party integrations</h3>
            <p>
              If you connect your GitHub or Trello account to Team Feedback, we receive limited
              data from those services (such as repository names and board identifiers) solely for
              the purpose of displaying that data within your project workspace. We do not store
              your third-party credentials.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Operate and maintain the Team Feedback platform.</li>
              <li>Authenticate you and keep your account secure.</li>
              <li>
                Display your submissions to the appropriate staff members and peers as part of the
                module or project you are enrolled in.
              </li>
              <li>Send you notifications about activity relevant to your projects and modules.</li>
              <li>
                Analyse aggregate usage patterns to identify bugs and improve platform performance.
              </li>
              <li>Respond to support requests you submit.</li>
            </ul>
            <p>
              We do not sell, rent, or share your personal data with third parties for marketing
              purposes.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>3. Data Sharing</h2>
            <p>
              Your data is shared only in the following limited circumstances:
            </p>
            <ul>
              <li>
                <strong>Within your institution</strong> — staff members with access to a module
                can view submissions made by students enrolled in that module, as is necessary for
                the academic assessment process.
              </li>
              <li>
                <strong>Service providers</strong> — we use a small number of trusted third-party
                providers (hosting, email delivery) who process data on our behalf and are bound
                by data processing agreements.
              </li>
              <li>
                <strong>Legal obligations</strong> — we may disclose information if required by
                law or in response to a valid legal request.
              </li>
            </ul>
          </section>

          <section className="legal-page__section">
            <h2>4. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you request
              account deletion, we will remove your personal data within 30 days, except where
              retention is required by law or where anonymised data forms part of a module's
              assessment record.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>5. Cookies</h2>
            <p>
              Team Feedback uses cookies to maintain your login session and remember your
              preferences. For full details, see our{" "}
              <a href="/cookies" className="legal-page__link">
                Cookie Policy
              </a>
              .
            </p>
          </section>

          <section className="legal-page__section">
            <h2>6. Your Rights</h2>
            <p>
              Depending on your location, you may have rights under applicable data protection
              law, including the right to access, correct, or delete your personal data. To
              exercise any of these rights, contact us at the address below.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>7. Security</h2>
            <p>
              We implement industry-standard technical and organisational measures to protect
              your data against unauthorised access, loss, or disclosure. All data in transit is
              encrypted using TLS. Passwords are hashed and never stored in plain text.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update
              the "last updated" date above and, for material changes, notify registered users by
              email.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>9. Contact</h2>
            <p>
              For questions about this policy or your personal data, please contact us at{" "}
              <a href="mailto:privacy@teamfeedback.app" className="legal-page__link">
                privacy@teamfeedback.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
