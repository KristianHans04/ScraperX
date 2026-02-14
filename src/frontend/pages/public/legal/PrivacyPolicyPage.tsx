import { LegalLayout } from '../../../components/public/LegalLayout';

export function PrivacyPolicyPage() {
  const sections = [
    { id: 'intro', title: '1. Introduction' },
    { id: 'data-collection', title: '2. Data We Collect' },
    { id: 'data-use', title: '3. How We Use Your Data' },
    { id: 'data-sharing', title: '4. Data Sharing' },
    { id: 'data-security', title: '5. Data Security' },
    { id: 'your-rights', title: '6. Your Rights' },
    { id: 'cookies', title: '7. Cookies' },
    { id: 'changes', title: '8. Changes to Policy' },
  ];

  return (
    <LegalLayout
      title="Privacy Policy"
      version="1.0"
      effectiveDate="January 1, 2026"
      sections={sections}
    >
      <section id="intro">
        <h2>1. Introduction</h2>
        <p>
          Scrapifie respects your privacy and is committed to protecting your personal data. This
          Privacy Policy explains how we collect, use, and protect your information.
        </p>
      </section>

      <section id="data-collection">
        <h2>2. Data We Collect</h2>
        <p>We collect the following types of data:</p>
        <ul>
          <li>Account information (name, email, password)</li>
          <li>Payment information (processed by third-party payment providers)</li>
          <li>Usage data (API requests, scraping jobs, logs)</li>
          <li>Technical data (IP address, browser type, device information)</li>
        </ul>
      </section>

      <section id="data-use">
        <h2>3. How We Use Your Data</h2>
        <p>We use your data to:</p>
        <ul>
          <li>Provide and maintain the Service</li>
          <li>Process payments and manage your account</li>
          <li>Send service updates and security alerts</li>
          <li>Improve the Service and develop new features</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section id="data-sharing">
        <h2>4. Data Sharing</h2>
        <p>
          We do not sell your personal data. We may share data with:
        </p>
        <ul>
          <li>Service providers (hosting, payment processing, email)</li>
          <li>Law enforcement when required by law</li>
          <li>Business partners with your consent</li>
        </ul>
      </section>

      <section id="data-security">
        <h2>5. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data, including
          encryption, access controls, and regular security audits.
        </p>
      </section>

      <section id="your-rights">
        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your data (right to be forgotten)</li>
          <li>Export your data (data portability)</li>
          <li>Object to data processing</li>
        </ul>
      </section>

      <section id="cookies">
        <h2>7. Cookies</h2>
        <p>
          We use cookies and similar technologies to improve your experience. For details, see our{' '}
          <a href="/legal/cookies" className="text-blue-600 dark:text-blue-400 hover:underline">
            Cookie Policy
          </a>
          .
        </p>
      </section>

      <section id="changes">
        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by email or through the Service.
        </p>
      </section>

      <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2>Contact Us</h2>
        <p>
          For privacy concerns, contact us at{' '}
          <a href="mailto:privacy@scrapifie.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            privacy@scrapifie.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
