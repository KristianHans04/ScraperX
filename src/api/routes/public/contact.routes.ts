import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
  honeypot: z.string().max(0, 'Bot detected').optional(),
});

const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per IP
  message: 'Too many contact requests from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export function createContactRoutes(): Router {
  // POST /api/public/contact - Submit contact form
  router.post('/', contactRateLimiter, async (req: Request, res: Response) => {
    try {
      const validatedData = contactSchema.parse(req.body);

      // Check honeypot
      if (validatedData.honeypot && validatedData.honeypot.length > 0) {
        return res.status(400).json({ error: 'Invalid submission' });
      }

      // TODO: Implement contact form handling
      // In production, you would:
      // 1. Store message in database (contact_message table)
      // 2. Send email to support team
      // 3. Send auto-reply to user
      // 4. Create support ticket (optional)

      // For now, just log and return success
      console.log('Contact form submission:', {
        name: validatedData.name,
        email: validatedData.email,
        subject: validatedData.subject,
        message: validatedData.message,
        ip: req.ip,
        timestamp: new Date(),
      });

      res.json({ 
        success: true, 
        message: 'Thank you for contacting us. We will get back to you within 24 hours.' 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }

      console.error('Error processing contact form:', error);
      res.status(500).json({ error: 'Failed to process contact form' });
    }
  });

  return router;
}

export default createContactRoutes;
