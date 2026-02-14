export function NodeSdkPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Node.js SDK</h1>
      <p className="lead">
        The official Node.js SDK for Scrapifie. Built with TypeScript for full type safety and
        IntelliSense support in modern editors.
      </p>

      <h2>Installation</h2>
      <pre><code className="language-bash">npm install @scrapifie/sdk</code></pre>

      <h2>Quick Start</h2>
      <pre><code className="language-typescript">{`import { Scrapifie } from '@scrapifie/sdk';

const client = new Scrapifie({
  apiKey: process.env.SCRAPIFIE_API_KEY,
});

// Simple scrape
const result = await client.scrape('https://example.com');
console.log(result.html);

// Browser rendering
const browserResult = await client.scrape('https://example.com', {
  engine: 'browser',
  waitFor: 'networkidle',
});

// With data extraction
const extracted = await client.scrape('https://example.com/products', {
  engine: 'browser',
  extractRules: {
    title: 'h1',
    price: '.price',
    description: '.desc',
  },
});
console.log(extracted.data);`}</code></pre>

      <h2>Batch Scraping</h2>
      <pre><code className="language-typescript">{`const urls = [
  'https://example.com/page-1',
  'https://example.com/page-2',
  'https://example.com/page-3',
];

const batch = await client.batch(urls, { engine: 'http' });

// Wait for all results
const results = await batch.wait();
for (const result of results) {
  console.log(\`\${result.url}: \${result.status}\`);
}`}</code></pre>

      <h2>Webhook Integration</h2>
      <pre><code className="language-typescript">{`// Fire-and-forget with webhook callback
const job = await client.scrape('https://example.com', {
  engine: 'browser',
  webhook: 'https://yourapp.com/api/webhook',
});

console.log(\`Job \${job.id} queued\`);

// In your webhook handler (e.g., Express)
app.post('/api/webhook', (req, res) => {
  const { jobId, status, result } = req.body;
  console.log(\`Job \${jobId} completed with status \${status}\`);
  res.sendStatus(200);
});`}</code></pre>

      <h2>Error Handling</h2>
      <pre><code className="language-typescript">{`import {
  ScrapifieError,
  RateLimitError,
  InsufficientCreditsError,
} from '@scrapifie/sdk';

try {
  const result = await client.scrape('https://example.com');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(\`Rate limited. Retry after \${error.retryAfter}s\`);
  } else if (error instanceof InsufficientCreditsError) {
    console.log('Not enough credits');
  } else if (error instanceof ScrapifieError) {
    console.log(\`API error: \${error.code} - \${error.message}\`);
  }
}`}</code></pre>

      <h2>Configuration</h2>
      <pre><code className="language-typescript">{`const client = new Scrapifie({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.scrapifie.io',   // Custom endpoint
  timeout: 30000,                        // Request timeout in ms
  maxRetries: 3,                         // Auto-retry on transient errors
});`}</code></pre>
    </div>
  );
}
