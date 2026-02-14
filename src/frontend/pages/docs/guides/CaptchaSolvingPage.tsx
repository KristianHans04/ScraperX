export function CaptchaSolvingPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>CAPTCHA Solving Guide</h1>
      <p className="lead">
        Learn how to handle CAPTCHAs automatically when scraping protected websites.
        Scrapifie supports automatic CAPTCHA detection and solving for Pro and Enterprise plans.
      </p>

      <h2>Overview</h2>
      <p>
        Many websites use CAPTCHAs to prevent automated access. Scrapifie can detect and solve
        common CAPTCHA types automatically, including reCAPTCHA v2, reCAPTCHA v3, hCaptcha, and
        Cloudflare Turnstile challenges.
      </p>

      <h2>Enabling CAPTCHA Solving</h2>
      <p>Add the <code>solveCaptcha</code> parameter to your scrape request:</p>
      <pre><code className="language-json">{`{
  "url": "https://protected-site.com",
  "engine": "browser",
  "solveCaptcha": true,
  "captchaTimeout": 30000
}`}</code></pre>

      <h2>Supported CAPTCHA Types</h2>
      <table>
        <thead>
          <tr><th>Type</th><th>Support Level</th><th>Extra Credits</th></tr>
        </thead>
        <tbody>
          <tr><td>reCAPTCHA v2</td><td>Full</td><td>+10 credits</td></tr>
          <tr><td>reCAPTCHA v3</td><td>Full</td><td>+10 credits</td></tr>
          <tr><td>hCaptcha</td><td>Full</td><td>+10 credits</td></tr>
          <tr><td>Cloudflare Turnstile</td><td>Full</td><td>+5 credits</td></tr>
          <tr><td>Image-based CAPTCHAs</td><td>Best effort</td><td>+15 credits</td></tr>
        </tbody>
      </table>

      <h2>Best Practices</h2>
      <ul>
        <li>Use the <code>stealth</code> engine to minimize CAPTCHA triggers</li>
        <li>Set reasonable request rates to avoid detection</li>
        <li>Use residential proxies for heavily protected sites</li>
        <li>Set a <code>captchaTimeout</code> appropriate for your use case (default: 30s)</li>
      </ul>

      <h2>Availability</h2>
      <p>CAPTCHA solving is available on Pro and Enterprise plans only. Free plan users will receive a <code>CAPTCHA_REQUIRED</code> error instead.</p>
    </div>
  );
}
