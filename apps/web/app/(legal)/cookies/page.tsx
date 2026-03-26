/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Team Feedback",
};

export default function CookiesPage() {
  return (
    <div className="legal-page">
      <div className="legal-page__container">
        <header className="legal-page__header">
          <p className="eyebrow">Legal</p>
          <h1>Cookie Policy</h1>
          <p className="lede">
            What cookies Team Feedback uses, why, and how to control them.
          </p>
          <p className="legal-page__meta">Last updated: January 2025</p>
        </header>

        <div className="legal-page__notice" role="note">
          <strong>Placeholder document.</strong> This is sample text written for development purposes
          and is not a legally binding cookie policy. Replace this content with your actual policy
          before going live.
        </div>

        <div className="legal-page__body">
          <section className="legal-page__section">
            <h2>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They
              allow the site to remember information about your visit, such as your login session
              and preferences, so you do not have to re-enter them on subsequent visits.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>2. Cookies We Use</h2>

            <h3>Essential cookies</h3>
            <p>
              These cookies are necessary for Team Feedback to function and cannot be disabled.
              They are set in response to actions you take, such as logging in.
            </p>
            <div className="legal-page__table-wrap">
              <table className="legal-page__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Purpose</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>tf_session</code>
                    </td>
                    <td>Maintains your authenticated session.</td>
                    <td>Session</td>
                  </tr>
                  <tr>
                    <td>
                      <code>tf_csrf</code>
                    </td>
                    <td>Protects against cross-site request forgery attacks.</td>
                    <td>Session</td>
                  </tr>
                  <tr>
                    <td>
                      <code>tf_prefs</code>
                    </td>
                    <td>Stores your UI preferences such as theme and sidebar state.</td>
                    <td>1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Analytics cookies</h3>
            <p>
              We use privacy-respecting analytics to understand how the platform is used and
              where improvements can be made. No personally identifiable information is sent to
              analytics providers.
            </p>
            <div className="legal-page__table-wrap">
              <table className="legal-page__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Purpose</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>_tf_anon</code>
                    </td>
                    <td>Anonymous session identifier for usage analytics.</td>
                    <td>30 days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Third-party cookies</h3>
            <p>
              When you connect GitHub or Trello, those services may set their own cookies as
              part of their OAuth authentication flow. These are governed by GitHub's and
              Trello's respective cookie policies.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>3. Managing Cookies</h2>
            <p>
              You can control cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul>
              <li>View the cookies currently stored on your device.</li>
              <li>Delete all or specific cookies.</li>
              <li>Block cookies from specific sites or all sites.</li>
            </ul>
            <p>
              Please note that disabling essential cookies will prevent you from logging in and
              using most features of Team Feedback.
            </p>
            <p>
              For guidance on managing cookies in your browser, visit your browser's help pages:
            </p>
            <ul>
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  className="legal-page__link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences"
                  className="legal-page__link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac"
                  className="legal-page__link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apple Safari
                </a>
              </li>
            </ul>
          </section>

          <section className="legal-page__section">
            <h2>4. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy to reflect changes in the cookies we use or for
              other operational, legal, or regulatory reasons. The "last updated" date at the
              top of this page will always reflect when changes were last made.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>5. Contact</h2>
            <p>
              If you have any questions about our use of cookies, please contact us at{" "}
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
