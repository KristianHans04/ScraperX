import { LegalLayout } from '../../../components/public/LegalLayout';
import { Download } from 'lucide-react';

export function DataProcessingAgreementPage() {
  const sections = [
    { id: 'definitions', title: '1. Definitions' },
    { id: 'scope', title: '2. Scope and Application' },
    { id: 'data-processing', title: '3. Data Processing' },
    { id: 'security', title: '4. Security Measures' },
    { id: 'sub-processors', title: '5. Sub-processors' },
    { id: 'data-subject-rights', title: '6. Data Subject Rights' },
    { id: 'liability', title: '7. Liability' },
  ];

  return (
    <LegalLayout
      title="Data Processing Agreement"
      version="1.0"
      effectiveDate="January 1, 2026"
      sections={sections}
    >
      <div className="mb-6">
        <button className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4 mr-2" />
          Download as PDF
        </button>
      </div>

      <section id="definitions">
        <h2>1. Definitions</h2>
        <p>In this Data Processing Agreement (DPA):</p>
        <ul>
          <li><strong>Controller</strong>: The customer using Scrapifie services</li>
          <li><strong>Processor</strong>: Scrapifie Inc.</li>
          <li><strong>Personal Data</strong>: Any information relating to an identified or identifiable natural person</li>
          <li><strong>Processing</strong>: Any operation performed on Personal Data</li>
        </ul>
      </section>

      <section id="scope">
        <h2>2. Scope and Application</h2>
        <p>
          This DPA applies when the Customer acts as a Controller and Scrapifie acts as a Processor
          of Personal Data in connection with the Services.
        </p>
      </section>

      <section id="data-processing">
        <h2>3. Data Processing</h2>
        <p>Scrapifie shall:</p>
        <ul>
          <li>Process Personal Data only on documented instructions from the Customer</li>
          <li>Not use Personal Data for any other purpose</li>
          <li>Ensure personnel processing Personal Data are bound by confidentiality</li>
          <li>Delete or return Personal Data at the end of the service provision</li>
        </ul>
      </section>

      <section id="security">
        <h2>4. Security Measures</h2>
        <p>Scrapifie implements appropriate technical and organizational measures including:</p>
        <ul>
          <li>Encryption of data at rest and in transit (TLS 1.3, AES-256)</li>
          <li>Access controls and authentication (MFA, RBAC)</li>
          <li>Regular security audits and penetration testing</li>
          <li>Incident response procedures</li>
          <li>Data backup and recovery processes</li>
        </ul>
      </section>

      <section id="sub-processors">
        <h2>5. Sub-processors</h2>
        <p>Scrapifie may engage the following sub-processors:</p>
        <ul>
          <li>Amazon Web Services (hosting infrastructure)</li>
          <li>Stripe (payment processing)</li>
          <li>SendGrid (transactional emails)</li>
        </ul>
        <p>
          The Customer will be notified of any changes to sub-processors with 30 days notice
          and may object within that period.
        </p>
      </section>

      <section id="data-subject-rights">
        <h2>6. Data Subject Rights</h2>
        <p>
          Scrapifie shall assist the Customer in responding to requests from data subjects
          exercising their rights under GDPR (access, rectification, erasure, restriction,
          portability, objection).
        </p>
      </section>

      <section id="liability">
        <h2>7. Liability and Indemnification</h2>
        <p>
          Each party's liability under this DPA shall be subject to the limitations and
          exclusions set out in the main Terms of Service.
        </p>
      </section>

      <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2>Execution</h2>
        <p>
          By using our Services, the Customer agrees to the terms of this DPA. For enterprise
          customers requiring a signed DPA, please contact{' '}
          <a href="mailto:legal@scrapifie.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            legal@scrapifie.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
