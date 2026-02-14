import { DocsLayout } from '../../components/docs/DocsLayout';

export function ChangelogPage() {
  const versions = [
    {
      version: '1.0.0',
      date: '2026-02-01',
      changes: [
        { type: 'Added', items: ['Initial public release', 'HTTP, Browser, and Stealth engines', 'Dashboard with usage analytics'] },
        { type: 'Security', items: ['Multi-factor authentication', 'API key rotation'] },
      ],
    },
  ];

  return (
    <DocsLayout>
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <h1>Changelog</h1>
        <p className="lead">
          Track new features, improvements, and bug fixes across all Scrapifie releases.
        </p>

        {versions.map((release) => (
          <div key={release.version} className="mb-12">
            <h2 className="flex items-center gap-3">
              <span>Version {release.version}</span>
              <span className="text-base font-normal text-gray-500">— {release.date}</span>
            </h2>

            {release.changes.map((section) => (
              <div key={section.type} className="mb-4">
                <h3 className="text-lg font-semibold">{section.type}</h3>
                <ul>
                  {section.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </article>
    </DocsLayout>
  );
}
