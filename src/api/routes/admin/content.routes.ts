import { Router } from 'express';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';
import { auditLogger } from '../../middleware/auditLogger';
import { BlogPostRepository } from '../../../db/repositories/blogPost.repository';
import { StatusPageRepository } from '../../../db/repositories/statusPage.repository';

const router = Router();
const blogPostRepo = new BlogPostRepository();
const statusPageRepo = new StatusPageRepository();

router.get('/blog', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await blogPostRepo.list({
      page,
      limit,
      status: req.query.status as any,
      authorId: req.query.authorId as string,
      search: req.query.search as string,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

router.post(
  '/blog',
  requireAdmin,
  auditLogger({
    category: 'content',
    action: 'blog.create',
    resourceType: 'blog_post',
  }),
  async (req: AdminRequest, res) => {
    try {
      const post = await blogPostRepo.create({
        ...req.body,
        authorId: req.user!.id,
      });
      res.json({ post });
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ error: 'Failed to create blog post' });
    }
  }
);

router.patch(
  '/blog/:id',
  requireAdmin,
  auditLogger({
    category: 'content',
    action: 'blog.update',
    resourceType: 'blog_post',
  }),
  async (req: AdminRequest, res) => {
    try {
      await blogPostRepo.update(req.params.id, req.body);
      res.json({ message: 'Blog post updated successfully' });
    } catch (error) {
      console.error('Error updating blog post:', error);
      res.status(500).json({ error: 'Failed to update blog post' });
    }
  }
);

router.post(
  '/blog/:id/publish',
  requireAdmin,
  auditLogger({
    category: 'content',
    action: 'blog.publish',
    resourceType: 'blog_post',
  }),
  async (req: AdminRequest, res) => {
    try {
      await blogPostRepo.publish(req.params.id);
      res.json({ message: 'Blog post published successfully' });
    } catch (error) {
      console.error('Error publishing blog post:', error);
      res.status(500).json({ error: 'Failed to publish blog post' });
    }
  }
);

router.get('/status', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const services = await statusPageRepo.getAllServices();
    const incidents = await statusPageRepo.getActiveIncidents();
    
    res.json({ services, incidents });
  } catch (error) {
    console.error('Error fetching status page:', error);
    res.status(500).json({ error: 'Failed to fetch status page' });
  }
});

router.patch(
  '/status/service/:serviceName',
  requireAdmin,
  auditLogger({
    category: 'operations',
    action: 'status.service_update',
    resourceType: 'service_status',
  }),
  async (req: AdminRequest, res) => {
    try {
      await statusPageRepo.updateServiceStatus(req.params.serviceName, req.body.status);
      res.json({ message: 'Service status updated successfully' });
    } catch (error) {
      console.error('Error updating service status:', error);
      res.status(500).json({ error: 'Failed to update service status' });
    }
  }
);

router.post(
  '/status/incident',
  requireAdmin,
  auditLogger({
    category: 'operations',
    action: 'status.incident_create',
    resourceType: 'incident',
  }),
  async (req: AdminRequest, res) => {
    try {
      const incident = await statusPageRepo.createIncident({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.json({ incident });
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ error: 'Failed to create incident' });
    }
  }
);

router.patch(
  '/status/incident/:id',
  requireAdmin,
  auditLogger({
    category: 'operations',
    action: 'status.incident_update',
    resourceType: 'incident',
  }),
  async (req: AdminRequest, res) => {
    try {
      await statusPageRepo.updateIncidentStatus(
        req.params.id,
        req.body.status,
        req.body.message,
        req.user!.id
      );
      res.json({ message: 'Incident updated successfully' });
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ error: 'Failed to update incident' });
    }
  }
);

export default router;
