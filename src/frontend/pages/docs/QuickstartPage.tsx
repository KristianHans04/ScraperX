import { DocsLayout } from '../../components/docs/DocsLayout';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function QuickstartPage() {
  const [copied, setCopied] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlExample = `curl -X POST https://api.scrapifie.com/v1/scrape \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "engine": "http"
  }'`;

  return (
    <DocsLayout>
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <h1>Quickstart Guide</h1>
        <p className="lead">
          Get started with Scrapifie in 5 minutes. This guide will walk you through making your first scraping request.
        </p>

        <h2>1. Get Your API Key</h2>
        <ol>
          <li>Sign up at <a href="/register">scrapifie.com/register</a></li>
          <li>Navigate to Dashboard → API Keys</li>
          <li>Click "Create API Key" and copy your key</li>
        </ol>

        <h2>2. Make Your First Request</h2>
        <p>Use cURL, or any HTTP client to make a POST request to <code>/v1/scrape</code>:</p>

        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{curlExample}</code>
          </pre>
          <button
            onClick={() => copyCode(curlExample)}
            className="absolute top-2 right-2 p-2 rounded bg-gray-800 hover:bg-gray-700"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <h2>3. Understand the Response</h2>
        <p>You'll receive a JSON response with the scraped data:</p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <code>{`{
  "success": true,
  "data": {
    "html": "<!DOCTYPE html>...",
    "status": 200,
    "url": "https://example.com"
  },
  "credits_used": 1,
  "timestamp": "2026-02-10T08:00:00Z"
}`}</code>
        </pre>

        <h2>4. Choose an Engine</h2>
        <p>Scrapifie offers three scraping engines:</p>
        <ul>
          <li><strong>HTTP</strong> (1 credit): Fast, lightweight requests for static content</li>
          <li><strong>Browser</strong> (10 credits): JavaScript execution and rendering</li>
          <li><strong>Stealth</strong> (25 credits): Advanced anti-bot evasion</li>
        </ul>

        <h2>Next Steps</h2>
        <ul>
          <li><a href="/docs/guides/engine-selection">Learn about engine selection</a></li>
          <li><a href="/docs/api/scraping">Explore the full API reference</a></li>
          <li><a href="/docs/guides/best-practices">Read best practices</a></li>
        </ul>
      </article>
    </DocsLayout>
  );
}
