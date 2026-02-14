import { Router } from 'express';
import { getPool } from '../../../db/connection.js';
import { createBlogRoutes } from './blog.routes.js';
import { createStatusRoutes } from './status.routes.js';
import { createContactRoutes } from './contact.routes.js';

export function createPublicRoutes(): Router {
  const router = Router();
  const pool = getPool();

  router.use('/blog', createBlogRoutes(pool));
  router.use('/status', createStatusRoutes(pool));
  router.use('/contact', createContactRoutes());

  return router;
}

export default createPublicRoutes;
