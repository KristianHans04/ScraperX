export function BatchApiPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Batch API Reference</h1>
      <p className="lead">
        Submit multiple scraping requests in a single API call. Batch jobs are processed in parallel
        and results can be retrieved individually or together.
      </p>

      <h2>Create Batch Job</h2>
      <div className="not-prose bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <code className="text-sm font-mono">POST /v1/batch</code>
      </div>
      <p>Submit a batch of URLs to scrape. Each URL in the batch can have its own configuration.</p>

      <h3>Request Body</h3>
      <pre><code className="language-json">{`{
  "urls": [
    {
      "url": "https://example.com/page-1",
      "engine": "http"
    },
    {
      "url": "https://example.com/page-2",
      "engine": "browser",
      "waitFor": "networkidle"
    }
  ],
  "webhook": "https://yourapp.com/webhook",
  "callbackOnEach": false
}`}</code></pre>

      <h3>Parameters</h3>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>urls</code></td><td>array</td><td>Yes</td><td>Array of URL objects (max 100 per batch)</td></tr>
          <tr><td><code>urls[].url</code></td><td>string</td><td>Yes</td><td>Target URL to scrape</td></tr>
          <tr><td><code>urls[].engine</code></td><td>string</td><td>No</td><td>Engine override per URL</td></tr>
          <tr><td><code>webhook</code></td><td>string</td><td>No</td><td>URL to receive completion callback</td></tr>
          <tr><td><code>callbackOnEach</code></td><td>boolean</td><td>No</td><td>Send webhook per URL vs. on batch completion</td></tr>
        </tbody>
      </table>

      <h3>Response</h3>
      <pre><code className="language-json">{`{
  "batchId": "batch_xyz789",
  "status": "processing",
  "totalUrls": 2,
  "createdAt": "2026-01-15T10:30:00Z"
}`}</code></pre>

      <h2>Get Batch Status</h2>
      <div className="not-prose bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <code className="text-sm font-mono">GET /v1/batch/:batchId</code>
      </div>

      <h3>Response</h3>
      <pre><code className="language-json">{`{
  "batchId": "batch_xyz789",
  "status": "completed",
  "totalUrls": 2,
  "completed": 2,
  "failed": 0,
  "jobs": [
    { "jobId": "job_001", "url": "https://example.com/page-1", "status": "completed" },
    { "jobId": "job_002", "url": "https://example.com/page-2", "status": "completed" }
  ]
}`}</code></pre>
    </div>
  );
}
