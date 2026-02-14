import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authExpress.js';
import { accountRepository } from '../../db/repositories/account.repository.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// GET /api/billing - Get billing overview
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const account = await accountRepository.findById(req.user!.accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      plan: account.plan,
      status: account.status,
      creditBalance: account.creditBalance,
      billingEmail: account.billingEmail,
      nextBillingDate: null, // Placeholder
      currentUsage: {
        creditsUsed: 0,
        jobsCompleted: 0,
      },
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch billing');
    res.status(500).json({ error: 'Failed to fetch billing information' });
  }
});

// GET /api/billing/invoices - List invoices
router.get('/invoices', requireAuth, async (req: Request, res: Response) => {
  try {
    // Placeholder - return empty array
    res.json({
      invoices: [],
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch invoices');
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// POST /api/billing/credits/purchase - Purchase credits
router.post('/credits/purchase', requireAuth, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Minimum purchase is 100 credits' });
    }

    // Placeholder - would integrate with payment processor
    res.json({
      success: false,
      error: 'Payment processing not yet configured',
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to purchase credits');
    res.status(500).json({ error: 'Failed to process credit purchase' });
  }
});

// POST /api/billing/subscribe - Subscribe to a plan
router.post('/subscribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;

    if (!plan || !['starter', 'professional', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Placeholder - would integrate with payment processor
    res.json({
      success: false,
      error: 'Subscription management not yet configured',
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to subscribe');
    res.status(500).json({ error: 'Failed to process subscription' });
  }
});

// GET /api/billing/plans - Get available plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    res.json({
      plans: [
        {
          id: 'starter',
          name: 'Starter',
          price: 29,
          credits: 1000,
          features: ['1,000 credits/month', 'Basic scraping', 'Email support'],
        },
        {
          id: 'professional',
          name: 'Professional',
          price: 99,
          credits: 5000,
          features: ['5,000 credits/month', 'Advanced scraping', 'Priority support', 'API access'],
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 299,
          credits: 20000,
          features: ['20,000 credits/month', 'Enterprise features', '24/7 support', 'Custom integration'],
        },
      ],
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to fetch plans');
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

export function createBillingRoutes() {
  return router;
}
