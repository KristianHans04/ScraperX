export function DataExtractionPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Data Extraction Guide</h1>
      <p className="lead">
        Learn how to extract structured data from web pages using Scrapifie extraction rules.
        Define CSS selectors, XPath expressions, or regex patterns to pull exactly the data you need.
      </p>

      <h2>Extraction Rules</h2>
      <p>
        Pass an <code>extractRules</code> object in your scrape request to extract specific data
        fields from the page HTML.
      </p>
      <pre><code className="language-json">{`{
  "url": "https://example.com/product",
  "engine": "browser",
  "extractRules": {
    "title": "h1.product-title",
    "price": ".price-amount",
    "description": "div.product-description p",
    "images": {
      "selector": "img.product-image",
      "attribute": "src",
      "multiple": true
    }
  }
}`}</code></pre>

      <h2>Selector Types</h2>
      <table>
        <thead>
          <tr><th>Type</th><th>Syntax</th><th>Example</th></tr>
        </thead>
        <tbody>
          <tr><td>CSS Selector</td><td>Standard CSS</td><td><code>div.class-name &gt; span</code></td></tr>
          <tr><td>XPath</td><td>Prefix with <code>xpath:</code></td><td><code>xpath://div[@class='price']</code></td></tr>
          <tr><td>Regex</td><td>Prefix with <code>regex:</code></td><td><code>regex:\$[\d,.]+</code></td></tr>
        </tbody>
      </table>

      <h2>Advanced Extraction</h2>
      <h3>Extracting Multiple Values</h3>
      <p>Set <code>multiple: true</code> to return an array of all matching elements:</p>
      <pre><code className="language-json">{`{
  "extractRules": {
    "allLinks": {
      "selector": "a.nav-link",
      "attribute": "href",
      "multiple": true
    }
  }
}`}</code></pre>

      <h3>Extracting Attributes</h3>
      <p>Use the <code>attribute</code> field to extract element attributes instead of text content:</p>
      <pre><code className="language-json">{`{
  "extractRules": {
    "imageUrl": {
      "selector": "img.hero",
      "attribute": "src"
    },
    "linkTarget": {
      "selector": "a.cta",
      "attribute": "href"
    }
  }
}`}</code></pre>

      <h2>Response Format</h2>
      <pre><code className="language-json">{`{
  "extracted": {
    "title": "Product Name",
    "price": "$29.99",
    "description": "A great product...",
    "images": [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg"
    ]
  }
}`}</code></pre>
    </div>
  );
}
