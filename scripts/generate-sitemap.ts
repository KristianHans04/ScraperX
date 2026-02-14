import fs from 'fs';
import path from 'path';

const baseUrl = 'https://scrapifie.com';

const staticPages = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/pricing', priority: 0.9, changefreq: 'weekly' },
  { url: '/about', priority: 0.7, changefreq: 'monthly' },
  { url: '/contact', priority: 0.7, changefreq: 'monthly' },
  { url: '/blog', priority: 0.8, changefreq: 'daily' },
  { url: '/status', priority: 0.6, changefreq: 'daily' },
  { url: '/docs', priority: 0.9, changefreq: 'weekly' },
  { url: '/legal/terms', priority: 0.5, changefreq: 'yearly' },
  { url: '/legal/privacy', priority: 0.5, changefreq: 'yearly' },
  { url: '/legal/acceptable-use', priority: 0.4, changefreq: 'yearly' },
  { url: '/legal/cookies', priority: 0.4, changefreq: 'yearly' },
  { url: '/legal/dpa', priority: 0.4, changefreq: 'yearly' },
];

function generateSitemap() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), xml);
  console.log('Sitemap generated successfully');
}

generateSitemap();
