export function PythonSdkPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Python SDK</h1>
      <p className="lead">
        The official Python SDK for Scrapifie. Provides a simple, type-safe interface for all Scrapifie API endpoints.
      </p>

      <h2>Installation</h2>
      <pre><code className="language-bash">pip install scrapifie</code></pre>

      <h2>Quick Start</h2>
      <pre><code className="language-python">{`from scrapifie import Scrapifie

client = Scrapifie(api_key="your_api_key")

# Simple scrape
result = client.scrape("https://example.com")
print(result.html)

# Browser rendering
result = client.scrape(
    "https://example.com",
    engine="browser",
    wait_for="networkidle"
)

# With data extraction
result = client.scrape(
    "https://example.com/products",
    engine="browser",
    extract_rules={
        "title": "h1",
        "price": ".price",
        "description": ".desc"
    }
)
print(result.extracted)`}</code></pre>

      <h2>Batch Scraping</h2>
      <pre><code className="language-python">{`urls = [
    "https://example.com/page-1",
    "https://example.com/page-2",
    "https://example.com/page-3",
]

batch = client.batch(urls, engine="http")

# Wait for all results
results = batch.wait()
for result in results:
    print(f"{result.url}: {result.status}")`}</code></pre>

      <h2>Async Support</h2>
      <pre><code className="language-python">{`import asyncio
from scrapifie import AsyncScrapifie

async def main():
    client = AsyncScrapifie(api_key="your_api_key")
    result = await client.scrape("https://example.com")
    print(result.html)

asyncio.run(main())`}</code></pre>

      <h2>Error Handling</h2>
      <pre><code className="language-python">{`from scrapifie.exceptions import (
    ScrapifieError,
    RateLimitError,
    InsufficientCreditsError,
)

try:
    result = client.scrape("https://example.com")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except InsufficientCreditsError:
    print("Not enough credits")
except ScrapifieError as e:
    print(f"API error: {e.code} - {e.message}")`}</code></pre>

      <h2>Configuration</h2>
      <pre><code className="language-python">{`client = Scrapifie(
    api_key="your_api_key",
    base_url="https://api.scrapifie.io",  # Custom endpoint
    timeout=30,                           # Request timeout in seconds
    max_retries=3,                        # Auto-retry on transient errors
)`}</code></pre>
    </div>
  );
}
