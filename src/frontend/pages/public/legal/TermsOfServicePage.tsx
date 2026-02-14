import { LegalLayout } from '../../../components/public/LegalLayout';

export function TermsOfServicePage() {
  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'service-description', title: '2. Service Description' },
    { id: 'user-accounts', title: '3. User Accounts' },
    { id: 'acceptable-use', title: '4. Acceptable Use' },
    { id: 'payment-billing', title: '5. Payment and Billing' },
    { id: 'intellectual-property', title: '6. Intellectual Property' },
    { id: 'termination', title: '7. Termination' },
    { id: 'disclaimers', title: '8. Disclaimers and Limitations' },
    { id: 'governing-law', title: '9. Governing Law' },
    { id: 'changes', title: '10. Changes to Terms' },
  ];

  return (
    <LegalLayout
      title="Terms of Service"
      version="1.0"
      effectiveDate="January 1, 2026"
      sections={sections}
    >
      <section id="acceptance">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Scrapifie (the "Service"), you agree to be bound by these Terms of
          Service. If you do not agree to these terms, do not use the Service.
        </p>
      </section>

      <section id="service-description">
        <h2>2. Service Description</h2>
        <p>
          Scrapifie provides a web scraping API that allows users to extract data from websites
          using multiple scraping engines. The Service includes HTTP, Browser, and Stealth engines
          for different use cases.
        </p>
      </section>

      <section id="user-accounts">
        <h2>3. User Accounts</h2>
        <p>
          You must create an account to use the Service. You are responsible for maintaining the
          confidentiality of your account credentials and for all activities that occur under your
          account.
        </p>
        <p>
          You must provide accurate and complete information when creating your account and keep
          this information up to date.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>4. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe on intellectual property rights of others</li>
          <li>Scrape websites that explicitly prohibit scraping in their terms of service or robots.txt</li>
          <li>Engage in activities that could harm the Service or other users</li>
          <li>Use the Service for any illegal or unauthorized purpose</li>
        </ul>
        <p>
          For complete details, see our{' '}
          <a href="/legal/acceptable-use" className="text-blue-600 dark:text-blue-400 hover:underline">
            Acceptable Use Policy
          </a>
          .
        </p>
      </section>

      <section id="payment-billing">
        <h2>5. Payment and Billing</h2>
        <p>
          The Service operates on a credit-based system. You can purchase credits through
          subscription plans or one-time credit packs.
        </p>
        <p>
          All fees are non-refundable except as required by law or as explicitly stated in our
          refund policy. We reserve the right to change pricing with 30 days notice.
        </p>
      </section>

      <section id="intellectual-property">
        <h2>6. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are owned by Scrapifie
          and are protected by international copyright, trademark, and other intellectual property
          laws.
        </p>
        <p>
          You retain all rights to data you scrape using the Service, but you grant us a license to
          use aggregated, anonymized data for improving the Service.
        </p>
      </section>

      <section id="termination">
        <h2>7. Termination</h2>
        <p>
          We may terminate or suspend your account immediately, without prior notice or liability,
          for any reason, including if you breach these Terms.
        </p>
        <p>
          Upon termination, your right to use the Service will immediately cease. You may delete
          your account at any time through the dashboard settings.
        </p>
      </section>

      <section id="disclaimers">
        <h2>8. Disclaimers and Limitations of Liability</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
          EXPRESS OR IMPLIED.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCRAPIFIE SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF THE
          SERVICE.
        </p>
      </section>

      <section id="governing-law">
        <h2>9. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction],
          without regard to its conflict of law provisions.
        </p>
      </section>

      <section id="changes">
        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will provide notice of
          significant changes by posting a notice on our website or sending you an email.
        </p>
        <p>
          Your continued use of the Service after changes become effective constitutes acceptance of
          the revised Terms.
        </p>
      </section>

      <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2>Contact Us</h2>
        <p>
          If you have any questions about these Terms of Service, please contact us at{' '}
          <a href="mailto:legal@scrapifie.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            legal@scrapifie.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
