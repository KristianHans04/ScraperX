export function ErrorsApiPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Error Code Reference</h1>
      <p className="lead">
        Complete list of error codes returned by the Scrapifie API. Use these codes to handle errors
        programmatically in your application.
      </p>

      <h2>HTTP Status Codes</h2>
      <table>
        <thead>
          <tr><th>Code</th><th>Meaning</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>200</code></td><td>OK</td><td>Request successful</td></tr>
          <tr><td><code>201</code></td><td>Created</td><td>Resource created successfully</td></tr>
          <tr><td><code>400</code></td><td>Bad Request</td><td>Invalid request parameters</td></tr>
          <tr><td><code>401</code></td><td>Unauthorized</td><td>Missing or invalid API key</td></tr>
          <tr><td><code>403</code></td><td>Forbidden</td><td>Insufficient permissions or plan limits exceeded</td></tr>
          <tr><td><code>404</code></td><td>Not Found</td><td>Resource does not exist</td></tr>
          <tr><td><code>429</code></td><td>Too Many Requests</td><td>Rate limit exceeded</td></tr>
          <tr><td><code>500</code></td><td>Internal Server Error</td><td>Unexpected server error</td></tr>
          <tr><td><code>503</code></td><td>Service Unavailable</td><td>Service temporarily unavailable</td></tr>
        </tbody>
      </table>

      <h2>Application Error Codes</h2>
      <table>
        <thead>
          <tr><th>Error Code</th><th>HTTP Status</th><th>Description</th><th>Resolution</th></tr>
        </thead>
        <tbody>
          <tr><td><code>INVALID_API_KEY</code></td><td>401</td><td>The API key provided is not valid</td><td>Check your API key in the dashboard</td></tr>
          <tr><td><code>EXPIRED_API_KEY</code></td><td>401</td><td>The API key has expired</td><td>Generate a new API key</td></tr>
          <tr><td><code>INSUFFICIENT_CREDITS</code></td><td>403</td><td>Not enough credits to process this request</td><td>Purchase more credits or upgrade plan</td></tr>
          <tr><td><code>RATE_LIMIT_EXCEEDED</code></td><td>429</td><td>Too many requests in the time window</td><td>Reduce request frequency or upgrade plan</td></tr>
          <tr><td><code>CONCURRENT_LIMIT</code></td><td>429</td><td>Maximum concurrent jobs reached</td><td>Wait for running jobs to complete</td></tr>
          <tr><td><code>INVALID_URL</code></td><td>400</td><td>The target URL is malformed or blocked</td><td>Verify the URL is correct and accessible</td></tr>
          <tr><td><code>SCRAPE_FAILED</code></td><td>500</td><td>The scraping engine could not extract data</td><td>Try a different engine or check the target site</td></tr>
          <tr><td><code>TIMEOUT</code></td><td>504</td><td>The request timed out</td><td>Increase timeout or simplify the request</td></tr>
          <tr><td><code>BLOCKED_BY_TARGET</code></td><td>403</td><td>The target site blocked the request</td><td>Use stealth engine or residential proxies</td></tr>
          <tr><td><code>CAPTCHA_REQUIRED</code></td><td>403</td><td>CAPTCHA detected but solving not enabled</td><td>Enable CAPTCHA solving in request config</td></tr>
        </tbody>
      </table>

      <h2>Error Response Format</h2>
      <pre><code className="language-json">{`{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "You do not have enough credits to process this request",
    "details": {
      "creditsRequired": 5,
      "creditsAvailable": 2
    }
  }
}`}</code></pre>
    </div>
  );
}
