// Webhook Routes
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { Router, Request, Response } from 'express';
import { webhookService } from '../../services/webhook.service.js';

const router = Router();

router.post(
  '/paystack',
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-paystack-signature'] as string;

      if (!signature) {
        return res.status(400).json({ error: 'Missing webhook signature' });
      }

      const payload = JSON.stringify(req.body);

      await webhookService.processPaystackWebhook(payload, signature);

      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      return res.status(400).json({ error: error.message });
    }
  }
);

export default router;
