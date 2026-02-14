import { LegalLayout } from '../../../components/public/LegalLayout';

export function AcceptableUsePolicyPage() {
  const sections = [
    { id: 'prohibited', title: '1. Prohibited Activities' },
    { id: 'responsible-scraping', title: '2. Responsible Scraping' },
    { id: 'compliance', title: '3. Legal Compliance' },
    { id: 'enforcement', title: '4. Enforcement' },
  ];

  return (
    <LegalLayout
      title="Acceptable Use Policy"
      version="1.0"
      effectiveDate="January 1, 2026"
      sections={sections}
    >
      <section id="prohibited">
        <h2>1. Prohibited Activities</h2>
        <p>You may not use Scrapifie to:</p>
        <ul>
          <li>Scrape websites that explicitly prohibit automated access</li>
          <li>Violate website terms of service or robots.txt files</li>
          <li>Engage in DDoS attacks or overwhelm target servers</li>
          <li>Collect personal data without consent</li>
          <li>Bypass CAPTCHA systems for malicious purposes</li>
          <li>Distribute scraped data that violates copyright laws</li>
        </ul>
      </section>

      <section id="responsible-scraping">
        <h2>2. Responsible Scraping</h2>
        <p>Users must:</p>
        <ul>
          <li>Respect rate limits and robots.txt files</li>
          <li>Use appropriate delays between requests</li>
          <li>Identify themselves with proper User-Agent headers</li>
          <li>Stop scraping if requested by the website owner</li>
        </ul>
      </section>

      <section id="compliance">
        <h2>3. Legal Compliance</h2>
        <p>
          Users are responsible for ensuring their scraping activities comply with all applicable
          laws, including but not limited to copyright law, data protection regulations (GDPR,
          CCPA), and computer fraud laws.
        </p>
      </section>

      <section id="enforcement">
        <h2>4. Enforcement</h2>
        <p>
          Violations of this policy may result in account suspension or termination. We reserve the
          right to investigate suspected violations and cooperate with law enforcement.
        </p>
      </section>
    </LegalLayout>
  );
}
