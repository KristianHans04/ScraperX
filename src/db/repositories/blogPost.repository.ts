import { getPool } from '../connection';
import { BlogPost, BlogPostStatus } from '../../types';

export class BlogPostRepository {
  private get pool() {
    return getPool();
  }

  async create(data: {
    title: string;
    slug?: string;
    excerpt?: string;
    content: string;
    featuredImageUrl?: string;
    featuredImageAlt?: string;
    tags?: string[];
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
    authorId: string;
    status?: BlogPostStatus;
  }): Promise<BlogPost> {
    const result = await this.pool.query(
      `INSERT INTO blog_post 
       (title, slug, excerpt, content, featured_image_url, featured_image_alt, tags, 
        meta_title, meta_description, og_image_url, author_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.title,
        data.slug || null,
        data.excerpt || null,
        data.content,
        data.featuredImageUrl || null,
        data.featuredImageAlt || null,
        data.tags || [],
        data.metaTitle || null,
        data.metaDescription || null,
        data.ogImageUrl || null,
        data.authorId,
        data.status || 'draft',
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<BlogPost | null> {
    const result = await this.pool.query(
      'SELECT * FROM blog_post WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const result = await this.pool.query(
      'SELECT * FROM blog_post WHERE slug = $1',
      [slug]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async list(params: {
    page?: number;
    limit?: number;
    status?: BlogPostStatus;
    authorId?: string;
    tag?: string;
    search?: string;
    sortBy?: 'created_at' | 'published_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ posts: BlogPost[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (params.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      queryParams.push(params.status);
    }

    if (params.authorId) {
      whereConditions.push(`author_id = $${paramIndex++}`);
      queryParams.push(params.authorId);
    }

    if (params.tag) {
      whereConditions.push(`$${paramIndex} = ANY(tags)`);
      queryParams.push(params.tag);
      paramIndex++;
    }

    if (params.search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM blog_post ${whereClause}`,
      queryParams
    );

    const dataResult = await this.pool.query(
      `SELECT * FROM blog_post ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      posts: dataResult.rows.map(this.mapRow),
      total: parseInt(countResult.rows[0].count),
    };
  }

  async update(id: string, data: Partial<{
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featuredImageUrl: string;
    featuredImageAlt: string;
    tags: string[];
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
    status: BlogPostStatus;
  }>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates.push(`${snakeKey} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) return;

    await this.pool.query(
      `UPDATE blog_post SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1`,
      values
    );
  }

  async publish(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE blog_post 
       SET status = 'published', 
           published_at = NOW(), 
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async unpublish(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE blog_post 
       SET status = 'draft', 
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async archive(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE blog_post 
       SET status = 'archived', 
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM blog_post WHERE id = $1',
      [id]
    );
  }

  async getPublished(limit: number = 10): Promise<BlogPost[]> {
    const result = await this.pool.query(
      `SELECT * FROM blog_post
       WHERE status = 'published' AND published_at <= NOW()
       ORDER BY published_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): BlogPost {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      featuredImageUrl: row.featured_image_url,
      featuredImageAlt: row.featured_image_alt,
      tags: row.tags || [],
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      ogImageUrl: row.og_image_url,
      status: row.status,
      authorId: row.author_id,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
