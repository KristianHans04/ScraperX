import { Router } from 'express';
import { getPool } from '../../../db/connection';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';

const router = Router();

router.post('/', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const { query, types, limit = 5 } = req.body;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const searchTypes = types || ['user', 'ticket', 'job'];
    const results: any = {};

    if (searchTypes.includes('user')) {
      const users = await getPool().query(
        `SELECT id, email, name FROM users 
         WHERE (email ILIKE $1 OR name ILIKE $1) AND deleted_at IS NULL
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      results.users = users.rows;
    }

    if (searchTypes.includes('ticket')) {
      const tickets = await getPool().query(
        `SELECT id, ticket_number, subject FROM support_ticket 
         WHERE (ticket_number ILIKE $1 OR subject ILIKE $1)
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      results.tickets = tickets.rows;
    }

    if (searchTypes.includes('job')) {
      const jobs = await getPool().query(
        `SELECT id, url, status FROM scrape_jobs 
         WHERE id::text ILIKE $1 OR url ILIKE $1
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      results.jobs = jobs.rows;
    }

    res.json(results);
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
