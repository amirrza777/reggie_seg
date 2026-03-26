/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Team Feedback",
};

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-page__container">
        <header className="legal-page__header">
          <p className="eyebrow">Legal</p>
          <h1>Terms of Service</h1>
          <p className="lede">
            The rules and conditions that govern your use of the Team Feedback platform.
          </p>
          <p className="legal-page__meta">Last updated: January 2025</p>
        </header>

        <div className="legal-page__notice" role="note">
          <strong>Placeholder document.</strong> This is sample text written for development purposes
          and is not a legally binding terms of service agreement. Replace this content with your
          actual terms before going live.
        </div>

        <div className="legal-page__body">
          <section className="legal-page__section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Team Feedback ("the Service"), you agree to be bound by these
              Terms of Service. If you do not agree, please do not use the Service. If you are
              using the Service on behalf of an institution, you represent that you have authority
              to bind that institution to these terms.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>2. Description of Service</h2>
            <p>
              Team Feedback is an academic team management platform designed to support
              peer assessment, collaborative project work, meeting coordination, and module
              administration in higher education settings. The Service is provided to registered
              users at participating institutions.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>3. Accounts</h2>
            <p>
              To use most features of Team Feedback, you must register for an account using a
              valid email address. You are responsible for:
            </p>
            <ul>
              <li>Keeping your password confidential and not sharing access with others.</li>
              <li>
                All activity that occurs under your account, whether or not you authorised it.
              </li>
              <li>
                Notifying us immediately at{" "}
                <a href="mailto:support@teamfeedback.app" className="legal-page__link">
                  support@teamfeedback.app
                </a>{" "}
                if you suspect unauthorised use of your account.
              </li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms or
              that we reasonably believe have been compromised.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Submit false, misleading, or fabricated peer assessment responses.</li>
              <li>
                Harass, intimidate, or post content that is abusive, defamatory, or discriminatory
                towards other users.
              </li>
              <li>
                Attempt to gain unauthorised access to another user's account or any part of the
                Service.
              </li>
              <li>
                Interfere with, disrupt, or place unreasonable load on the Service's
                infrastructure.
              </li>
              <li>
                Use automated tools to scrape, copy, or harvest data from the Service without
                prior written permission.
              </li>
              <li>Violate any applicable law or regulation.</li>
            </ul>
          </section>

          <section className="legal-page__section">
            <h2>5. Content</h2>
            <p>
              You retain ownership of any content you submit to Team Feedback (such as assessment
              responses and meeting notes). By submitting content, you grant us a limited licence
              to store, display, and transmit that content to the extent necessary to operate the
              Service.
            </p>
            <p>
              You are solely responsible for ensuring that content you submit does not infringe
              any third-party intellectual property rights and complies with all applicable laws.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>6. Intellectual Property</h2>
            <p>
              The Team Feedback platform, including its design, software, and documentation, is
              owned by Team Feedback and is protected by copyright and other intellectual property
              laws. You may not copy, modify, distribute, or create derivative works from any
              part of the platform without our prior written consent.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>7. Third-Party Integrations</h2>
            <p>
              The Service integrates with third-party platforms including GitHub and Trello. Your
              use of those services is governed by their respective terms of service, which we
              encourage you to review. We are not responsible for the availability or content of
              third-party services.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>8. Disclaimers and Limitation of Liability</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind,
              express or implied. We do not warrant that the Service will be uninterrupted,
              error-free, or free of harmful components.
            </p>
            <p>
              To the fullest extent permitted by law, Team Feedback shall not be liable for any
              indirect, incidental, special, or consequential damages arising out of or in
              connection with your use of the Service.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>9. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after
              changes are posted constitutes your acceptance of the revised Terms. We will notify
              registered users of material changes by email.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>10. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of England
              and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts
              of England and Wales.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>11. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:legal@teamfeedback.app" className="legal-page__link">
                legal@teamfeedback.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
