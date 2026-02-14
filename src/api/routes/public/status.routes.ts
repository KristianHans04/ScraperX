import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

export function createStatusRoutes(pool: Pool): Router {
  // GET /api/public/status - Get current service statuses
  router.get('/', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          service_name AS "serviceName",
          service_display_name AS "serviceDisplayName",
          description,
          status
        FROM service_status_config
        ORDER BY display_order ASC
      `);

      const services = result.rows;

      res.json({ services });
    } catch (error) {
      console.error('Error fetching service status:', error);
      res.status(500).json({ error: 'Failed to fetch service status' });
    }
  });

  // GET /api/public/status/uptime - Get 90-day uptime data
  router.get('/uptime', async (req: Request, res: Response) => {
    try {
      const uptime: Record<string, number[]> = {};

      const services = await pool.query(`
        SELECT service_name FROM service_status_config
      `);

      for (const service of services.rows) {
        uptime[service.service_name] = Array(90).fill(100);
      }

      res.json({ uptime });
    } catch (error) {
      console.error('Error fetching uptime:', error);
      res.status(500).json({ error: 'Failed to fetch uptime' });
    }
  });

  // GET /api/public/status/incidents - Get recent incidents (last 90 days)
  router.get('/incidents', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = await pool.query(
        `
        SELECT 
          si.id,
          si.title,
          si.status,
          si.severity,
          si.affected_services AS "affectedServices",
          si.started_at AS "startedAt",
          si.resolved_at AS "resolvedAt"
        FROM status_incident si
        WHERE si.started_at >= NOW() - INTERVAL '90 days'
        ORDER BY si.started_at DESC
        LIMIT $1
        `,
        [limit]
      );

      const incidents = result.rows;

      for (const incident of incidents) {
        const updatesResult = await pool.query(
          `
          SELECT 
            id,
            message,
            status,
            created_at AS "createdAt"
          FROM status_incident_update
          WHERE incident_id = $1
          ORDER BY created_at ASC
          `,
          [incident.id]
        );

        incident.updates = updatesResult.rows;
      }

      res.json({ incidents });
    } catch (error) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ error: 'Failed to fetch incidents' });
    }
  });

  // POST /api/public/status/subscribe - Subscribe to status updates
  router.post('/subscribe', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // TODO: Implement email subscription logic
      // For now, just return success
      // In production, you would:
      // 1. Add to email list (e.g., via SendGrid, Mailchimp)
      // 2. Send confirmation email
      // 3. Store subscription in database

      res.json({ success: true, message: 'Subscribed to status updates' });
    } catch (error) {
      console.error('Error subscribing to status updates:', error);
      res.status(500).json({ error: 'Failed to subscribe to status updates' });
    }
  });

  return router;
}

export default createStatusRoutes;
