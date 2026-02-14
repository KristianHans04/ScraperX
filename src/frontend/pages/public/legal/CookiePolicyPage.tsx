import { LegalLayout } from '../../../components/public/LegalLayout';

export function CookiePolicyPage() {
  const sections = [
    { id: 'intro', title: '1. Introduction' },
    { id: 'what-are-cookies', title: '2. What Are Cookies' },
    { id: 'cookies-we-use', title: '3. Cookies We Use' },
    { id: 'managing-cookies', title: '4. Managing Cookies' },
    { id: 'updates', title: '5. Updates' },
  ];

  return (
    <LegalLayout
      title="Cookie Policy"
      version="1.0"
      effectiveDate="January 1, 2026"
      sections={sections}
    >
      <section id="intro">
        <h2>1. Introduction</h2>
        <p>
          This Cookie Policy explains how Scrapifie uses cookies and similar technologies on our website.
        </p>
      </section>

      <section id="what-are-cookies">
        <h2>2. What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit a website. They help us remember
          your preferences and understand how you use our service.
        </p>
      </section>

      <section id="cookies-we-use">
        <h2>3. Cookies We Use</h2>
        
        <h3>Necessary Cookies (Always Active)</h3>
        <p>Essential for the website to function properly. Cannot be disabled.</p>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-700 my-4">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Cookie Name</th>
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Purpose</th>
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 p-2">session_token</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">Authentication and session management</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">Session</td>
            </tr>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 p-2">csrf_token</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">Security protection against CSRF attacks</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">Session</td>
            </tr>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 p-2">cookieConsent</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">Stores your cookie preferences</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">1 year</td>
            </tr>
          </tbody>
        </table>

        <h3>Analytics Cookies (Optional)</h3>
        <p>Help us understand how visitors use our website.</p>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-700 my-4">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Cookie Name</th>
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Purpose</th>
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 p-2">_ga</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">Google Analytics - track user behavior</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">2 years</td>
            </tr>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 p-2">_gid</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">Google Analytics - distinguish users</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">24 hours</td>
            </tr>
          </tbody>
        </table>

        <h3>Marketing Cookies (Optional)</h3>
        <p>Used to deliver relevant advertisements.</p>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-700 my-4">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Cookie Name</th>
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Purpose</th>
              <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 p-2">_fbp</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">Facebook Pixel - track conversions</td>
              <td className="border border-gray-300 dark:border-gray-700 p-2">3 months</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="managing-cookies">
        <h2>4. Managing Cookies</h2>
        <p>
          You can control and manage cookies through:
        </p>
        <ul>
          <li>Our cookie consent banner (appears on first visit)</li>
          <li>Your browser settings</li>
          <li>Third-party opt-out tools (e.g., Google Analytics Opt-out)</li>
        </ul>
        <p>
          Note: Disabling necessary cookies may affect website functionality.
        </p>
      </section>

      <section id="updates">
        <h2>5. Updates to This Policy</h2>
        <p>
          We may update this Cookie Policy to reflect changes in technology or regulations. Please review
          this page periodically.
        </p>
      </section>

      <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2>Contact Us</h2>
        <p>
          Questions about cookies? Contact us at{' '}
          <a href="mailto:privacy@scrapifie.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            privacy@scrapifie.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
