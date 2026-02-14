import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

export function createBlogRoutes(pool: Pool): Router {
  // GET /api/public/blog/posts - List published blog posts
  router.get('/posts', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = Math.min(parseInt(req.query.perPage as string) || 12, 50);
      const tag = req.query.tag as string | undefined;
      const offset = (page - 1) * perPage;

      let query = `
        SELECT 
          bp.id,
          bp.title,
          bp.slug,
          bp.excerpt,
          bp.featured_image_url AS "featuredImageUrl",
          bp.tags,
          bp.published_at AS "publishedAt",
          u.name AS "authorName"
        FROM blog_post bp
        JOIN users u ON bp.author_id = u.id
        WHERE bp.status = 'published'
          AND bp.published_at <= NOW()
      `;

      const params: any[] = [];

      if (tag) {
        params.push(tag);
        query += ` AND $${params.length} = ANY(bp.tags)`;
      }

      query += ` ORDER BY bp.published_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(perPage, offset);

      const result = await pool.query(query, params);

      const countQuery = tag
        ? `SELECT COUNT(*) FROM blog_post WHERE status = 'published' AND published_at <= NOW() AND $1 = ANY(tags)`
        : `SELECT COUNT(*) FROM blog_post WHERE status = 'published' AND published_at <= NOW()`;
      
      const countResult = await pool.query(countQuery, tag ? [tag] : []);
      const totalPosts = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalPosts / perPage);

      const posts = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        featuredImageUrl: row.featuredImageUrl,
        tags: row.tags,
        publishedAt: row.publishedAt,
        author: {
          name: row.authorName,
        },
      }));

      res.json({
        posts,
        page,
        perPage,
        totalPosts,
        totalPages,
      });
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  // GET /api/public/blog/posts/:slug - Get single blog post
  router.get('/posts/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      const result = await pool.query(
        `
        SELECT 
          bp.id,
          bp.title,
          bp.slug,
          bp.content,
          bp.excerpt,
          bp.featured_image_url AS "featuredImageUrl",
          bp.tags,
          bp.published_at AS "publishedAt",
          u.name AS "authorName"
        FROM blog_post bp
        JOIN users u ON bp.author_id = u.id
        WHERE bp.slug = $1
          AND bp.status = 'published'
          AND bp.published_at <= NOW()
        `,
        [slug]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      const post = {
        id: result.rows[0].id,
        title: result.rows[0].title,
        slug: result.rows[0].slug,
        content: result.rows[0].content,
        excerpt: result.rows[0].excerpt,
        featuredImageUrl: result.rows[0].featuredImageUrl,
        tags: result.rows[0].tags,
        publishedAt: result.rows[0].publishedAt,
        author: {
          name: result.rows[0].authorName,
        },
      };

      const relatedResult = await pool.query(
        `
        SELECT 
          bp.id,
          bp.title,
          bp.slug,
          bp.excerpt,
          bp.featured_image_url AS "featuredImageUrl"
        FROM blog_post bp
        WHERE bp.id != $1
          AND bp.status = 'published'
          AND bp.published_at <= NOW()
          AND bp.tags && $2
        ORDER BY bp.published_at DESC
        LIMIT 3
        `,
        [result.rows[0].id, result.rows[0].tags]
      );

      const relatedPosts = relatedResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        featuredImageUrl: row.featuredImageUrl,
      }));

      res.json({ post, relatedPosts });
    } catch (error) {
      console.error('Error fetching blog post:', error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  // GET /api/public/blog/tags - Get all tags
  router.get('/tags', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT unnest(tags) AS tag
        FROM blog_post
        WHERE status = 'published' AND published_at <= NOW()
        ORDER BY tag
      `);

      const tags = result.rows.map((row) => row.tag);

      res.json({ tags });
    } catch (error) {
      console.error('Error fetching blog tags:', error);
      res.status(500).json({ error: 'Failed to fetch blog tags' });
    }
  });

  return router;
}

export default createBlogRoutes;
