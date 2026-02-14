export function JobsApiPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Jobs API Reference</h1>
      <p className="lead">
        Retrieve and manage your scraping jobs. Each API request creates a job that progresses through
        a lifecycle: pending, queued, running, completed, or failed.
      </p>

      <h2>List Jobs</h2>
      <div className="not-prose bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <code className="text-sm font-mono">GET /v1/jobs</code>
      </div>
      <p>Returns a paginated list of your jobs, sorted by creation date (newest first).</p>

      <h3>Query Parameters</h3>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>page</code></td><td>integer</td><td>1</td><td>Page number for pagination</td></tr>
          <tr><td><code>limit</code></td><td>integer</td><td>20</td><td>Results per page (max 100)</td></tr>
          <tr><td><code>status</code></td><td>string</td><td>-</td><td>Filter by status: pending, queued, running, completed, failed</td></tr>
          <tr><td><code>engine</code></td><td>string</td><td>-</td><td>Filter by engine: http, browser, stealth</td></tr>
        </tbody>
      </table>

      <h3>Response</h3>
      <pre><code className="language-json">{`{
  "data": [
    {
      "id": "job_abc123",
      "url": "https://example.com",
      "status": "completed",
      "engine": "browser",
      "creditsUsed": 5,
      "createdAt": "2026-01-15T10:30:00Z",
      "completedAt": "2026-01-15T10:30:12Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}`}</code></pre>

      <h2>Get Job Details</h2>
      <div className="not-prose bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <code className="text-sm font-mono">GET /v1/jobs/:jobId</code>
      </div>
      <p>Returns full details for a specific job, including the request configuration, response data, and timing metadata.</p>

      <h3>Response</h3>
      <pre><code className="language-json">{`{
  "id": "job_abc123",
  "url": "https://example.com",
  "status": "completed",
  "engine": "browser",
  "config": {
    "waitFor": "networkidle",
    "screenshot": true,
    "extractRules": {}
  },
  "result": {
    "statusCode": 200,
    "html": "<html>...</html>",
    "screenshot": "https://storage.scrapifie.io/..."
  },
  "timing": {
    "queuedAt": "2026-01-15T10:30:00Z",
    "startedAt": "2026-01-15T10:30:02Z",
    "completedAt": "2026-01-15T10:30:12Z",
    "duration": 10000
  },
  "creditsUsed": 5,
  "proxyTier": "datacenter"
}`}</code></pre>
    </div>
  );
}
