# Scrapifie Billing and Monetization

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-DOC-006 |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Product & Engineering Team |
| Status | Draft |
| Classification | Internal |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Revenue Model Overview](#2-revenue-model-overview)
3. [Subscription Tiers](#3-subscription-tiers)
4. [Credit System](#4-credit-system)
5. [Stripe Integration](#5-stripe-integration)
6. [Usage Metering](#6-usage-metering)
7. [Billing Workflows](#7-billing-workflows)
8. [Revenue Analytics](#8-revenue-analytics)
9. [Compliance and Taxation](#9-compliance-and-taxation)
10. [Appendix](#10-appendix)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete billing and monetization system for Scrapifie, including subscription plans, credit calculations, Stripe integration, and revenue tracking.

### 1.2 Business Objectives

| Objective | Target Metric |
|-----------|---------------|
| Monthly Recurring Revenue | $100K by Month 12 |
| Average Revenue Per User | $150+/month |
| Gross Margin | >80% |
| Churn Rate | <5% monthly |
| Net Revenue Retention | >110% |

### 1.3 Competitive Positioning

| Competitor | Pricing Model | Our Advantage |
|------------|---------------|---------------|
| ScraperAPI | Per-request | Predictable monthly costs |
| ScrapingBee | Per-credit | Higher included volume |
| Bright Data | Per-GB | Simpler pricing model |
| Apify | Per-actor-run | All-inclusive platform |

---

## 2. Revenue Model Overview

### 2.1 Revenue Streams

```
+------------------------------------------------------------------+
|                     REVENUE MODEL                                 |
+------------------------------------------------------------------+
|                                                                   |
|  PRIMARY REVENUE (85%)                                           |
|  +----------------------------------------------------------+    |
|  |                  SUBSCRIPTION FEES                        |    |
|  |                                                           |    |
|  |  Starter     Growth      Business    Enterprise          |    |
|  |  $49/mo      $149/mo     $349/mo     Custom              |    |
|  |                                                           |    |
|  |  100K        500K        2M          Unlimited           |    |
|  |  credits     credits     credits     credits             |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  SECONDARY REVENUE (10%)                                         |
|  +----------------------------------------------------------+    |
|  |                   OVERAGE CHARGES                         |    |
|  |                                                           |    |
|  |  Credits beyond plan limit: $0.05 per 1,000 credits      |    |
|  |  (Applied when monthly credits exhausted)                 |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  TERTIARY REVENUE (5%)                                           |
|  +----------------------------------------------------------+    |
|  |                  PREMIUM ADD-ONS                          |    |
|  |                                                           |    |
|  |  - Dedicated proxies: +$200/mo                           |    |
|  |  - Priority support: +$100/mo                            |    |
|  |  - Custom retention: +$50/mo                             |    |
|  |  - SLA guarantee: +$150/mo                               |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 2.2 Unit Economics

| Metric | Target | Notes |
|--------|--------|-------|
| Customer Acquisition Cost | <$200 | Content marketing focus |
| Lifetime Value | >$3,000 | 24-month average tenure |
| LTV:CAC Ratio | >15:1 | Healthy SaaS benchmark |
| Payback Period | <3 months | Fast payback |
| Gross Margin per Request | ~$0.00003 | After proxy/compute costs |

---

## 3. Subscription Tiers

### 3.1 Plan Comparison

| Feature | Starter | Growth | Business | Enterprise |
|---------|---------|--------|----------|------------|
| **Monthly Price** | $49 | $149 | $349 | Custom |
| **Annual Price** | $470 (20% off) | $1,430 (20% off) | $3,350 (20% off) | Custom |
| **Credits Included** | 100,000 | 500,000 | 2,000,000 | Unlimited |
| **Rate Limit** | 10/sec | 50/sec | 200/sec | Custom |
| **Concurrent Jobs** | 10 | 50 | 200 | Unlimited |
| **Data Retention** | 7 days | 14 days | 30 days | Custom |
| **API Keys** | 2 | 10 | Unlimited | Unlimited |
| **Team Members** | 1 | 5 | 20 | Unlimited |
| **Support** | Email | Priority Email | Dedicated Slack | Dedicated CSM |
| **SLA** | Best Effort | 99.5% | 99.9% | 99.99% |
| **Webhooks** | Yes | Yes | Yes | Yes |
| **JavaScript Rendering** | Yes | Yes | Yes | Yes |
| **Residential Proxies** | Add-on | Included | Included | Included |
| **CAPTCHA Solving** | Add-on | Included | Included | Included |
| **Custom Headers** | Yes | Yes | Yes | Yes |
| **Geolocation** | 5 countries | 20 countries | All countries | All countries |
| **Batch API** | 100 URLs | 1,000 URLs | 10,000 URLs | Unlimited |

### 3.2 Plan Definitions (Stripe Products)

```typescript
// config/plans.ts

export interface PlanConfig {
  id: string;
  name: string;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  priceMonthly: number;
  priceYearly: number;
  creditsIncluded: number;
  overageRate: number;             // Per 1,000 credits
  features: PlanFeatures;
  limits: PlanLimits;
}

export interface PlanFeatures {
  jsRendering: boolean;
  residentialProxies: boolean;
  mobileProxies: boolean;
  captchaSolving: boolean;
  webhooks: boolean;
  batchApi: boolean;
  priorityQueue: boolean;
  dedicatedSupport: boolean;
  customRetention: boolean;
  slaGuarantee: boolean;
}

export interface PlanLimits {
  ratePerSecond: number;
  maxConcurrent: number;
  maxBatchSize: number;
  retentionDays: number;
  maxApiKeys: number;
  maxTeamMembers: number;
  geoCountries: number | 'all';
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    stripePriceIdMonthly: 'price_starter_monthly',
    stripePriceIdYearly: 'price_starter_yearly',
    priceMonthly: 4900,           // cents
    priceYearly: 47000,           // cents
    creditsIncluded: 100_000,
    overageRate: 50,               // $0.05 per 1,000 credits
    features: {
      jsRendering: true,
      residentialProxies: false,
      mobileProxies: false,
      captchaSolving: false,
      webhooks: true,
      batchApi: true,
      priorityQueue: false,
      dedicatedSupport: false,
      customRetention: false,
      slaGuarantee: false,
    },
    limits: {
      ratePerSecond: 10,
      maxConcurrent: 10,
      maxBatchSize: 100,
      retentionDays: 7,
      maxApiKeys: 2,
      maxTeamMembers: 1,
      geoCountries: 5,
    },
  },
  
  growth: {
    id: 'growth',
    name: 'Growth',
    stripePriceIdMonthly: 'price_growth_monthly',
    stripePriceIdYearly: 'price_growth_yearly',
    priceMonthly: 14900,
    priceYearly: 143000,
    creditsIncluded: 500_000,
    overageRate: 40,               // $0.04 per 1,000 credits
    features: {
      jsRendering: true,
      residentialProxies: true,
      mobileProxies: false,
      captchaSolving: true,
      webhooks: true,
      batchApi: true,
      priorityQueue: false,
      dedicatedSupport: false,
      customRetention: false,
      slaGuarantee: false,
    },
    limits: {
      ratePerSecond: 50,
      maxConcurrent: 50,
      maxBatchSize: 1000,
      retentionDays: 14,
      maxApiKeys: 10,
      maxTeamMembers: 5,
      geoCountries: 20,
    },
  },
  
  business: {
    id: 'business',
    name: 'Business',
    stripePriceIdMonthly: 'price_business_monthly',
    stripePriceIdYearly: 'price_business_yearly',
    priceMonthly: 34900,
    priceYearly: 335000,
    creditsIncluded: 2_000_000,
    overageRate: 30,               // $0.03 per 1,000 credits
    features: {
      jsRendering: true,
      residentialProxies: true,
      mobileProxies: true,
      captchaSolving: true,
      webhooks: true,
      batchApi: true,
      priorityQueue: true,
      dedicatedSupport: true,
      customRetention: false,
      slaGuarantee: true,
    },
    limits: {
      ratePerSecond: 200,
      maxConcurrent: 200,
      maxBatchSize: 10000,
      retentionDays: 30,
      maxApiKeys: -1,             // Unlimited
      maxTeamMembers: 20,
      geoCountries: 'all',
    },
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    stripePriceIdMonthly: 'price_enterprise_custom',
    stripePriceIdYearly: 'price_enterprise_custom',
    priceMonthly: 0,              // Custom pricing
    priceYearly: 0,
    creditsIncluded: -1,          // Unlimited
    overageRate: 0,               // No overage
    features: {
      jsRendering: true,
      residentialProxies: true,
      mobileProxies: true,
      captchaSolving: true,
      webhooks: true,
      batchApi: true,
      priorityQueue: true,
      dedicatedSupport: true,
      customRetention: true,
      slaGuarantee: true,
    },
    limits: {
      ratePerSecond: -1,          // Custom
      maxConcurrent: -1,
      maxBatchSize: -1,
      retentionDays: 90,
      maxApiKeys: -1,
      maxTeamMembers: -1,
      geoCountries: 'all',
    },
  },
};

// Helper to get plan by ID
export function getPlan(planId: string): PlanConfig {
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  return plan;
}

// Check if feature is available
export function hasFeature(planId: string, feature: keyof PlanFeatures): boolean {
  const plan = getPlan(planId);
  return plan.features[feature];
}

// Check limit
export function getLimit(planId: string, limit: keyof PlanLimits): number | 'all' {
  const plan = getPlan(planId);
  return plan.limits[limit];
}
```

### 3.3 Free Trial Configuration

```typescript
// config/trial.ts

export const TRIAL_CONFIG = {
  // Trial duration
  durationDays: 14,
  
  // Credits during trial
  trialCredits: 10_000,
  
  // Limits during trial (more restrictive than Starter)
  limits: {
    ratePerSecond: 5,
    maxConcurrent: 5,
    maxBatchSize: 50,
    retentionDays: 3,
    maxApiKeys: 1,
    maxTeamMembers: 1,
    geoCountries: 3,
  },
  
  // Features during trial
  features: {
    jsRendering: true,
    residentialProxies: true,     // Let them try it
    mobileProxies: false,
    captchaSolving: true,         // Let them try it
    webhooks: true,
    batchApi: true,
    priorityQueue: false,
    dedicatedSupport: false,
    customRetention: false,
    slaGuarantee: false,
  },
  
  // Conversion nudges
  nudges: {
    creditsAt50Percent: true,     // Notify when 50% credits used
    creditsAt80Percent: true,     // Notify when 80% credits used
    daysRemaining: [7, 3, 1],     // Days to send reminders
    offerDiscount: true,          // 20% discount if convert in trial
  },
};

// Trial to paid conversion tracking
export interface TrialConversion {
  trialStartDate: Date;
  trialEndDate: Date;
  creditsUsed: number;
  requestsMade: number;
  featuresUsed: string[];
  convertedToPlan: string | null;
  conversionDate: Date | null;
  discountApplied: string | null;
}
```

---

## 4. Credit System

### 4.1 Credit Calculation Overview

```
+------------------------------------------------------------------+
|                     CREDIT SYSTEM                                 |
+------------------------------------------------------------------+
|                                                                   |
|  BASE CREDIT COST                                                |
|  +----------------------------------------------------------+    |
|  |  1 successful HTTP request = 1 credit                    |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  MULTIPLIERS (Cumulative)                                        |
|  +----------------------------------------------------------+    |
|  |                                                           |    |
|  |  Engine Multipliers:                                      |    |
|  |  - HTTP (static):     1x (base)                          |    |
|  |  - Browser (JS):      5x                                 |    |
|  |  - Stealth:           10x                                |    |
|  |                                                           |    |
|  |  Proxy Multipliers:                                       |    |
|  |  - Datacenter:        +0x (included)                     |    |
|  |  - Residential:       +3x                                |    |
|  |  - Mobile:            +10x                               |    |
|  |  - ISP:               +5x                                |    |
|  |                                                           |    |
|  |  Feature Multipliers:                                     |    |
|  |  - CAPTCHA solving:   +10 credits (flat)                 |    |
|  |  - Screenshot:        +2 credits (flat)                  |    |
|  |  - PDF export:        +5 credits (flat)                  |    |
|  |  - Premium geo:       +1x                                |    |
|  |                                                           |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  EXAMPLE CALCULATIONS                                            |
|  +----------------------------------------------------------+    |
|  |                                                           |    |
|  |  Simple HTTP:           1 credit                         |    |
|  |  Browser + Screenshot:  5 + 2 = 7 credits               |    |
|  |  Stealth + Residential: 10 * 4 = 40 credits             |    |
|  |  Stealth + Mobile + CAPTCHA: (10 * 11) + 10 = 120       |    |
|  |                                                           |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 4.2 Credit Calculation Service

```typescript
// services/credits.ts

export interface CreditCalculationInput {
  engine: 'http' | 'browser' | 'stealth';
  proxyType: 'datacenter' | 'residential' | 'mobile' | 'isp';
  features: {
    captchaSolving: boolean;
    screenshot: boolean;
    pdf: boolean;
    premiumGeo: boolean;
  };
  success: boolean;
}

export interface CreditBreakdown {
  baseCredits: number;
  engineMultiplier: number;
  proxyMultiplier: number;
  featureCredits: number;
  totalCredits: number;
  details: {
    component: string;
    credits: number;
    description: string;
  }[];
}

// Multiplier configurations
const ENGINE_MULTIPLIERS: Record<string, number> = {
  http: 1,
  browser: 5,
  stealth: 10,
};

const PROXY_MULTIPLIERS: Record<string, number> = {
  datacenter: 1,      // No additional cost
  residential: 4,     // 3x additional = 4x total
  mobile: 11,         // 10x additional = 11x total
  isp: 6,             // 5x additional = 6x total
};

const FEATURE_COSTS: Record<string, number> = {
  captchaSolving: 10,
  screenshot: 2,
  pdf: 5,
  premiumGeo: 0,      // Handled as multiplier
};

const PREMIUM_GEO_MULTIPLIER = 2;

export function calculateCredits(input: CreditCalculationInput): CreditBreakdown {
  const details: CreditBreakdown['details'] = [];
  
  // Failed requests cost 0 credits
  if (!input.success) {
    return {
      baseCredits: 0,
      engineMultiplier: 1,
      proxyMultiplier: 1,
      featureCredits: 0,
      totalCredits: 0,
      details: [{ component: 'failed', credits: 0, description: 'Failed request - no charge' }],
    };
  }
  
  // Base cost
  const baseCredits = 1;
  details.push({
    component: 'base',
    credits: baseCredits,
    description: 'Base request cost',
  });
  
  // Engine multiplier
  const engineMultiplier = ENGINE_MULTIPLIERS[input.engine];
  if (engineMultiplier > 1) {
    details.push({
      component: 'engine',
      credits: baseCredits * (engineMultiplier - 1),
      description: `${input.engine} engine (${engineMultiplier}x)`,
    });
  }
  
  // Proxy multiplier
  const proxyMultiplier = PROXY_MULTIPLIERS[input.proxyType];
  if (proxyMultiplier > 1) {
    details.push({
      component: 'proxy',
      credits: baseCredits * engineMultiplier * (proxyMultiplier - 1),
      description: `${input.proxyType} proxy (${proxyMultiplier}x total)`,
    });
  }
  
  // Calculate base with multipliers
  let baseWithMultipliers = baseCredits * engineMultiplier * proxyMultiplier;
  
  // Premium geo multiplier
  if (input.features.premiumGeo) {
    const geoCost = baseWithMultipliers * (PREMIUM_GEO_MULTIPLIER - 1);
    baseWithMultipliers *= PREMIUM_GEO_MULTIPLIER;
    details.push({
      component: 'premiumGeo',
      credits: geoCost,
      description: 'Premium geolocation (2x)',
    });
  }
  
  // Feature flat costs
  let featureCredits = 0;
  
  if (input.features.captchaSolving) {
    featureCredits += FEATURE_COSTS.captchaSolving;
    details.push({
      component: 'captcha',
      credits: FEATURE_COSTS.captchaSolving,
      description: 'CAPTCHA solving',
    });
  }
  
  if (input.features.screenshot) {
    featureCredits += FEATURE_COSTS.screenshot;
    details.push({
      component: 'screenshot',
      credits: FEATURE_COSTS.screenshot,
      description: 'Screenshot capture',
    });
  }
  
  if (input.features.pdf) {
    featureCredits += FEATURE_COSTS.pdf;
    details.push({
      component: 'pdf',
      credits: FEATURE_COSTS.pdf,
      description: 'PDF export',
    });
  }
  
  const totalCredits = baseWithMultipliers + featureCredits;
  
  return {
    baseCredits,
    engineMultiplier,
    proxyMultiplier,
    featureCredits,
    totalCredits,
    details,
  };
}

// Estimate credits for a request before execution
export function estimateCredits(options: ScrapeOptions): number {
  const engine = determineEngine(options);
  const proxyType = options.proxyType || 'datacenter';
  
  const estimate = calculateCredits({
    engine,
    proxyType,
    features: {
      captchaSolving: options.solveCaptcha || false,
      screenshot: options.screenshot || false,
      pdf: options.pdf || false,
      premiumGeo: isPremiumGeo(options.country),
    },
    success: true,
  });
  
  return estimate.totalCredits;
}

// Premium geo countries (higher proxy costs)
const PREMIUM_GEO_COUNTRIES = new Set([
  'CN', // China
  'IR', // Iran
  'RU', // Russia
  'KP', // North Korea
]);

function isPremiumGeo(country?: string): boolean {
  return country ? PREMIUM_GEO_COUNTRIES.has(country) : false;
}

function determineEngine(options: ScrapeOptions): 'http' | 'browser' | 'stealth' {
  if (options.engine) return options.engine;
  if (options.stealth) return 'stealth';
  if (options.jsRendering || options.waitFor) return 'browser';
  return 'http';
}
```

### 4.3 Credit Balance Management

```typescript
// services/balance.ts

import { Pool } from 'pg';
import { Redis } from 'ioredis';

interface BalanceService {
  getBalance(orgId: string): Promise<number>;
  deductCredits(orgId: string, amount: number, jobId: string): Promise<boolean>;
  addCredits(orgId: string, amount: number, reason: string): Promise<void>;
  getUsageThisMonth(orgId: string): Promise<UsageStats>;
}

interface UsageStats {
  creditsUsed: number;
  creditsIncluded: number;
  creditsOverage: number;
  percentUsed: number;
  projectedOverage: number;
}

export class CreditBalanceService implements BalanceService {
  constructor(
    private db: Pool,
    private redis: Redis,
  ) {}
  
  async getBalance(orgId: string): Promise<number> {
    // Check Redis cache first
    const cached = await this.redis.get(`scrx:balance:${orgId}`);
    if (cached !== null) {
      return parseInt(cached, 10);
    }
    
    // Fetch from database
    const result = await this.db.query(
      'SELECT credits_balance FROM organizations WHERE id = $1',
      [orgId],
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Organization not found: ${orgId}`);
    }
    
    const balance = result.rows[0].credits_balance;
    
    // Cache for 30 seconds
    await this.redis.set(`scrx:balance:${orgId}`, balance, 'EX', 30);
    
    return balance;
  }
  
  async deductCredits(
    orgId: string,
    amount: number,
    jobId: string,
  ): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Lock organization row
      const result = await client.query(
        `UPDATE organizations 
         SET credits_balance = credits_balance - $1,
             updated_at = NOW()
         WHERE id = $2 AND credits_balance >= $1
         RETURNING credits_balance`,
        [amount, orgId],
      );
      
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      
      // Record the deduction
      await client.query(
        `INSERT INTO credit_transactions 
         (organization_id, job_id, amount, type, balance_after, created_at)
         VALUES ($1, $2, $3, 'deduction', $4, NOW())`,
        [orgId, jobId, -amount, result.rows[0].credits_balance],
      );
      
      await client.query('COMMIT');
      
      // Invalidate cache
      await this.redis.del(`scrx:balance:${orgId}`);
      
      // Check for low balance alert
      const newBalance = result.rows[0].credits_balance;
      await this.checkLowBalanceAlert(orgId, newBalance);
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async addCredits(
    orgId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `UPDATE organizations 
         SET credits_balance = credits_balance + $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING credits_balance`,
        [amount, orgId],
      );
      
      await client.query(
        `INSERT INTO credit_transactions 
         (organization_id, amount, type, reason, balance_after, created_at)
         VALUES ($1, $2, 'addition', $3, $4, NOW())`,
        [orgId, amount, reason, result.rows[0].credits_balance],
      );
      
      await client.query('COMMIT');
      
      // Invalidate cache
      await this.redis.del(`scrx:balance:${orgId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getUsageThisMonth(orgId: string): Promise<UsageStats> {
    const result = await this.db.query(`
      SELECT 
        o.credits_included_monthly,
        o.credits_balance,
        COALESCE(SUM(ur.credits_used), 0) as credits_used,
        COALESCE(SUM(ur.credits_overage_used), 0) as credits_overage
      FROM organizations o
      LEFT JOIN usage_records ur ON ur.organization_id = o.id
        AND ur.period_start >= DATE_TRUNC('month', NOW())
      WHERE o.id = $1
      GROUP BY o.id, o.credits_included_monthly, o.credits_balance
    `, [orgId]);
    
    const row = result.rows[0];
    const creditsIncluded = row.credits_included_monthly;
    const creditsUsed = parseInt(row.credits_used, 10);
    const creditsOverage = parseInt(row.credits_overage, 10);
    
    // Calculate projected overage based on current usage rate
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysElapsed = Math.max(1, (now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyRate = creditsUsed / daysElapsed;
    const projectedTotal = dailyRate * daysInMonth;
    const projectedOverage = Math.max(0, projectedTotal - creditsIncluded);
    
    return {
      creditsUsed,
      creditsIncluded,
      creditsOverage,
      percentUsed: (creditsUsed / creditsIncluded) * 100,
      projectedOverage,
    };
  }
  
  private async checkLowBalanceAlert(orgId: string, balance: number): Promise<void> {
    // Get plan details
    const result = await this.db.query(
      'SELECT credits_included_monthly FROM organizations WHERE id = $1',
      [orgId],
    );
    
    const monthlyCredits = result.rows[0].credits_included_monthly;
    const percentRemaining = (balance / monthlyCredits) * 100;
    
    // Alert thresholds
    const thresholds = [20, 10, 5];
    
    for (const threshold of thresholds) {
      if (percentRemaining <= threshold) {
        const alertKey = `scrx:alert:lowbalance:${orgId}:${threshold}`;
        const alreadySent = await this.redis.get(alertKey);
        
        if (!alreadySent) {
          await this.sendLowBalanceAlert(orgId, percentRemaining);
          // Don't send again for 24 hours
          await this.redis.set(alertKey, '1', 'EX', 86400);
        }
        break;
      }
    }
  }
  
  private async sendLowBalanceAlert(
    orgId: string,
    percentRemaining: number,
  ): Promise<void> {
    // Queue notification job
    await this.redis.publish('notifications', JSON.stringify({
      type: 'low_balance',
      orgId,
      percentRemaining,
      timestamp: new Date().toISOString(),
    }));
  }
}
```

### 4.4 Credit Transaction History

```sql
-- Credit transactions table
CREATE TABLE credit_transactions (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    job_id UUID REFERENCES scrape_jobs(id),
    
    -- Transaction details
    amount BIGINT NOT NULL,                    -- Positive for additions, negative for deductions
    type VARCHAR(20) NOT NULL,                 -- 'addition', 'deduction', 'refund', 'adjustment'
    reason VARCHAR(255),
    
    -- Balance tracking
    balance_before BIGINT,
    balance_after BIGINT NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_type CHECK (type IN ('addition', 'deduction', 'refund', 'adjustment'))
);

-- Indexes
CREATE INDEX idx_credit_txn_org ON credit_transactions(organization_id, created_at DESC);
CREATE INDEX idx_credit_txn_type ON credit_transactions(type, created_at DESC);
CREATE INDEX idx_credit_txn_job ON credit_transactions(job_id) WHERE job_id IS NOT NULL;

-- Use BRIN for time-series
CREATE INDEX idx_credit_txn_time ON credit_transactions USING BRIN (created_at);
```

---

## 5. Stripe Integration

### 5.1 Stripe Configuration

```typescript
// config/stripe.ts

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Stripe product and price IDs
export const STRIPE_CONFIG = {
  // Products
  products: {
    starter: 'prod_starter',
    growth: 'prod_growth',
    business: 'prod_business',
    enterprise: 'prod_enterprise',
  },
  
  // Prices (monthly)
  pricesMonthly: {
    starter: 'price_starter_monthly',
    growth: 'price_growth_monthly',
    business: 'price_business_monthly',
  },
  
  // Prices (yearly)
  pricesYearly: {
    starter: 'price_starter_yearly',
    growth: 'price_growth_yearly',
    business: 'price_business_yearly',
  },
  
  // Overage pricing (metered)
  overagePrices: {
    starter: 'price_overage_starter',     // $0.05 per 1,000 credits
    growth: 'price_overage_growth',       // $0.04 per 1,000 credits
    business: 'price_overage_business',   // $0.03 per 1,000 credits
  },
  
  // Add-on prices
  addons: {
    dedicatedProxies: 'price_addon_dedicated_proxies',
    prioritySupport: 'price_addon_priority_support',
    customRetention: 'price_addon_custom_retention',
    slaGuarantee: 'price_addon_sla_guarantee',
  },
  
  // Webhook secret
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  
  // Trial settings
  trial: {
    days: 14,
  },
};
```

### 5.2 Customer and Subscription Management

```typescript
// services/stripe.ts

import Stripe from 'stripe';
import { stripe, STRIPE_CONFIG } from '../config/stripe';
import { PLANS } from '../config/plans';

interface CreateCustomerInput {
  email: string;
  name: string;
  organizationId: string;
  metadata?: Record<string, string>;
}

interface CreateSubscriptionInput {
  customerId: string;
  priceId: string;
  trial?: boolean;
  couponId?: string;
}

export class StripeService {
  // Create a new Stripe customer
  async createCustomer(input: CreateCustomerInput): Promise<Stripe.Customer> {
    return stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: {
        organization_id: input.organizationId,
        ...input.metadata,
      },
    });
  }
  
  // Create a subscription
  async createSubscription(input: CreateSubscriptionInput): Promise<Stripe.Subscription> {
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: input.customerId,
      items: [{ price: input.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    };
    
    // Add trial if requested
    if (input.trial) {
      subscriptionParams.trial_period_days = STRIPE_CONFIG.trial.days;
    }
    
    // Add coupon if provided
    if (input.couponId) {
      subscriptionParams.coupon = input.couponId;
    }
    
    return stripe.subscriptions.create(subscriptionParams);
  }
  
  // Update subscription (plan change)
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    prorate: boolean = true,
  ): Promise<Stripe.Subscription> {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: prorate ? 'create_prorations' : 'none',
    });
  }
  
  // Cancel subscription
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
  ): Promise<Stripe.Subscription> {
    if (immediately) {
      return stripe.subscriptions.cancel(subscriptionId);
    }
    
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  
  // Resume canceled subscription
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }
  
  // Create checkout session for new subscription
  async createCheckoutSession(
    customerId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    const plan = PLANS[planId];
    const priceId = billingCycle === 'monthly' 
      ? plan.stripePriceIdMonthly 
      : plan.stripePriceIdYearly;
    
    return stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: STRIPE_CONFIG.trial.days,
      },
    });
  }
  
  // Create portal session for self-service billing
  async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
  
  // Report usage for metered billing
  async reportUsage(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number,
  ): Promise<Stripe.UsageRecord> {
    return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment',
    });
  }
  
  // Get upcoming invoice preview
  async getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice> {
    return stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  }
  
  // Create a coupon
  async createCoupon(
    percentOff: number,
    duration: 'once' | 'repeating' | 'forever',
    durationInMonths?: number,
    name?: string,
  ): Promise<Stripe.Coupon> {
    return stripe.coupons.create({
      percent_off: percentOff,
      duration,
      duration_in_months: duration === 'repeating' ? durationInMonths : undefined,
      name,
    });
  }
}
```

### 5.3 Webhook Handler

```typescript
// api/webhooks/stripe.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { stripe, STRIPE_CONFIG } from '../../config/stripe';
import { PLANS } from '../../config/plans';

interface WebhookContext {
  db: Pool;
  redis: Redis;
  logger: Logger;
}

export async function handleStripeWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
  ctx: WebhookContext,
): Promise<void> {
  const sig = request.headers['stripe-signature'] as string;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      request.rawBody!,
      sig,
      STRIPE_CONFIG.webhookSecret,
    );
  } catch (err) {
    ctx.logger.error({ err }, 'Webhook signature verification failed');
    return reply.status(400).send({ error: 'Invalid signature' });
  }
  
  ctx.logger.info({ type: event.type, id: event.id }, 'Received Stripe webhook');
  
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, ctx);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, ctx);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, ctx);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription, ctx);
        break;
        
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, ctx);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, ctx);
        break;
        
      case 'invoice.upcoming':
        await handleUpcomingInvoice(event.data.object as Stripe.Invoice, ctx);
        break;
        
      default:
        ctx.logger.info({ type: event.type }, 'Unhandled webhook event');
    }
    
    return reply.status(200).send({ received: true });
  } catch (error) {
    ctx.logger.error({ error, eventType: event.type }, 'Webhook handler error');
    return reply.status(500).send({ error: 'Webhook handler failed' });
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  ctx: WebhookContext,
): Promise<void> {
  const customerId = subscription.customer as string;
  
  // Get organization from customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  
  const orgId = customer.metadata.organization_id;
  
  // Determine plan from price
  const priceId = subscription.items.data[0].price.id;
  const planId = getPlanIdFromPrice(priceId);
  const plan = PLANS[planId];
  
  // Update organization
  await ctx.db.query(`
    UPDATE organizations SET
      plan_id = $1,
      subscription_status = $2,
      stripe_subscription_id = $3,
      credits_balance = credits_balance + $4,
      credits_included_monthly = $5,
      rate_limit_per_second = $6,
      max_concurrent_jobs = $7,
      updated_at = NOW()
    WHERE id = $8
  `, [
    planId,
    subscription.status,
    subscription.id,
    plan.creditsIncluded,
    plan.creditsIncluded,
    plan.limits.ratePerSecond,
    plan.limits.maxConcurrent,
    orgId,
  ]);
  
  // Create subscription record
  await ctx.db.query(`
    INSERT INTO subscriptions (
      organization_id, plan_id, plan_name, stripe_subscription_id,
      stripe_price_id, billing_cycle, base_price_cents, credits_included,
      status, current_period_start, current_period_end, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
  `, [
    orgId,
    planId,
    plan.name,
    subscription.id,
    priceId,
    getBillingCycle(subscription),
    getPlanPrice(planId, getBillingCycle(subscription)),
    plan.creditsIncluded,
    subscription.status,
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
  ]);
  
  ctx.logger.info({ orgId, planId }, 'Subscription created');
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  ctx: WebhookContext,
): Promise<void> {
  // Get organization
  const result = await ctx.db.query(`
    SELECT id, plan_id FROM organizations WHERE stripe_subscription_id = $1
  `, [subscription.id]);
  
  if (result.rows.length === 0) return;
  
  const org = result.rows[0];
  const priceId = subscription.items.data[0].price.id;
  const newPlanId = getPlanIdFromPrice(priceId);
  const newPlan = PLANS[newPlanId];
  
  // Check if plan changed
  const planChanged = org.plan_id !== newPlanId;
  
  // Update organization
  await ctx.db.query(`
    UPDATE organizations SET
      plan_id = $1,
      subscription_status = $2,
      credits_included_monthly = $3,
      rate_limit_per_second = $4,
      max_concurrent_jobs = $5,
      updated_at = NOW()
    WHERE id = $6
  `, [
    newPlanId,
    subscription.status,
    newPlan.creditsIncluded,
    newPlan.limits.ratePerSecond,
    newPlan.limits.maxConcurrent,
    org.id,
  ]);
  
  // Update subscription record
  await ctx.db.query(`
    UPDATE subscriptions SET
      plan_id = $1,
      plan_name = $2,
      stripe_price_id = $3,
      credits_included = $4,
      status = $5,
      current_period_start = $6,
      current_period_end = $7,
      cancel_at_period_end = $8,
      updated_at = NOW()
    WHERE stripe_subscription_id = $9
  `, [
    newPlanId,
    newPlan.name,
    priceId,
    newPlan.creditsIncluded,
    subscription.status,
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
    subscription.cancel_at_period_end,
    subscription.id,
  ]);
  
  // If plan upgraded, add additional credits
  if (planChanged) {
    const oldPlan = PLANS[org.plan_id];
    if (newPlan.creditsIncluded > oldPlan.creditsIncluded) {
      const additionalCredits = newPlan.creditsIncluded - oldPlan.creditsIncluded;
      await ctx.db.query(`
        UPDATE organizations 
        SET credits_balance = credits_balance + $1
        WHERE id = $2
      `, [additionalCredits, org.id]);
    }
  }
  
  ctx.logger.info({ orgId: org.id, newPlanId, planChanged }, 'Subscription updated');
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  ctx: WebhookContext,
): Promise<void> {
  // Update organization to free tier
  await ctx.db.query(`
    UPDATE organizations SET
      plan_id = 'free',
      subscription_status = 'canceled',
      credits_included_monthly = 0,
      rate_limit_per_second = 1,
      max_concurrent_jobs = 1,
      updated_at = NOW()
    WHERE stripe_subscription_id = $1
  `, [subscription.id]);
  
  // Update subscription record
  await ctx.db.query(`
    UPDATE subscriptions SET
      status = 'canceled',
      canceled_at = NOW(),
      updated_at = NOW()
    WHERE stripe_subscription_id = $1
  `, [subscription.id]);
  
  ctx.logger.info({ subscriptionId: subscription.id }, 'Subscription deleted');
}

async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  ctx: WebhookContext,
): Promise<void> {
  // Get organization and send notification
  const result = await ctx.db.query(`
    SELECT o.id, o.billing_email, u.email as owner_email
    FROM organizations o
    JOIN users u ON u.organization_id = o.id AND u.role = 'owner'
    WHERE o.stripe_subscription_id = $1
  `, [subscription.id]);
  
  if (result.rows.length === 0) return;
  
  const org = result.rows[0];
  const trialEnd = new Date(subscription.trial_end! * 1000);
  
  // Queue notification email
  await ctx.redis.lpush('notifications:email', JSON.stringify({
    type: 'trial_ending',
    to: org.owner_email,
    data: {
      organizationId: org.id,
      trialEndDate: trialEnd.toISOString(),
      daysRemaining: Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    },
  }));
  
  ctx.logger.info({ orgId: org.id, trialEnd }, 'Trial ending notification sent');
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  ctx: WebhookContext,
): Promise<void> {
  // Get organization
  const result = await ctx.db.query(`
    SELECT id, plan_id FROM organizations WHERE stripe_customer_id = $1
  `, [invoice.customer as string]);
  
  if (result.rows.length === 0) return;
  
  const org = result.rows[0];
  const plan = PLANS[org.plan_id];
  
  // Reset monthly credits
  await ctx.db.query(`
    UPDATE organizations SET
      credits_balance = $1,
      updated_at = NOW()
    WHERE id = $2
  `, [plan.creditsIncluded, org.id]);
  
  // Store invoice record
  await ctx.db.query(`
    INSERT INTO invoices (
      organization_id, stripe_invoice_id, invoice_number, status,
      subtotal_cents, tax_cents, total_cents, amount_paid_cents, amount_due_cents,
      period_start, period_end, invoice_date, paid_at, line_items, created_at
    ) VALUES ($1, $2, $3, 'paid', $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, NOW())
    ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      status = 'paid',
      amount_paid_cents = EXCLUDED.amount_paid_cents,
      paid_at = NOW()
  `, [
    org.id,
    invoice.id,
    invoice.number,
    invoice.subtotal,
    invoice.tax || 0,
    invoice.total,
    invoice.amount_paid,
    invoice.amount_due,
    new Date(invoice.period_start * 1000),
    new Date(invoice.period_end * 1000),
    new Date(invoice.created * 1000),
    JSON.stringify(invoice.lines.data),
  ]);
  
  ctx.logger.info({ 
    orgId: org.id, 
    invoiceId: invoice.id, 
    amount: invoice.amount_paid 
  }, 'Invoice paid');
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  ctx: WebhookContext,
): Promise<void> {
  // Get organization
  const result = await ctx.db.query(`
    SELECT o.id, o.billing_email, u.email as owner_email
    FROM organizations o
    JOIN users u ON u.organization_id = o.id AND u.role = 'owner'
    WHERE o.stripe_customer_id = $1
  `, [invoice.customer as string]);
  
  if (result.rows.length === 0) return;
  
  const org = result.rows[0];
  
  // Update subscription status
  await ctx.db.query(`
    UPDATE organizations SET
      subscription_status = 'past_due',
      updated_at = NOW()
    WHERE id = $1
  `, [org.id]);
  
  // Queue notification
  await ctx.redis.lpush('notifications:email', JSON.stringify({
    type: 'payment_failed',
    to: org.owner_email,
    data: {
      organizationId: org.id,
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      updatePaymentUrl: `https://app.scrapifie.io/billing/update-payment`,
    },
  }));
  
  ctx.logger.warn({ 
    orgId: org.id, 
    invoiceId: invoice.id 
  }, 'Invoice payment failed');
}

async function handleUpcomingInvoice(
  invoice: Stripe.Invoice,
  ctx: WebhookContext,
): Promise<void> {
  // This fires ~3 days before the next invoice
  // Good time to add overage charges
  
  const result = await ctx.db.query(`
    SELECT o.id, o.plan_id, s.stripe_subscription_id
    FROM organizations o
    JOIN subscriptions s ON s.organization_id = o.id
    WHERE o.stripe_customer_id = $1 AND s.status = 'active'
  `, [invoice.customer as string]);
  
  if (result.rows.length === 0) return;
  
  const org = result.rows[0];
  
  // Calculate overage for current period
  const usageResult = await ctx.db.query(`
    SELECT 
      SUM(credits_used) as total_used,
      SUM(credits_overage_used) as overage_used
    FROM usage_records
    WHERE organization_id = $1
      AND period_start >= $2
      AND period_end <= $3
  `, [
    org.id,
    new Date(invoice.period_start * 1000),
    new Date(invoice.period_end * 1000),
  ]);
  
  const overageCredits = parseInt(usageResult.rows[0]?.overage_used || '0', 10);
  
  if (overageCredits > 0) {
    const plan = PLANS[org.plan_id];
    const overageAmount = Math.ceil(overageCredits / 1000) * plan.overageRate;
    
    // Add overage as invoice item
    await stripe.invoiceItems.create({
      customer: invoice.customer as string,
      amount: overageAmount,
      currency: 'usd',
      description: `Overage: ${overageCredits.toLocaleString()} additional credits`,
    });
    
    ctx.logger.info({ 
      orgId: org.id, 
      overageCredits, 
      overageAmount 
    }, 'Added overage to upcoming invoice');
  }
}

// Helper functions
function getPlanIdFromPrice(priceId: string): string {
  for (const [planId, plan] of Object.entries(PLANS)) {
    if (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdYearly === priceId) {
      return planId;
    }
  }
  return 'starter';
}

function getBillingCycle(subscription: Stripe.Subscription): 'monthly' | 'yearly' {
  const interval = subscription.items.data[0].price.recurring?.interval;
  return interval === 'year' ? 'yearly' : 'monthly';
}

function getPlanPrice(planId: string, cycle: 'monthly' | 'yearly'): number {
  const plan = PLANS[planId];
  return cycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
}
```

---

## 6. Usage Metering

### 6.1 Usage Collection Pipeline

```
+------------------------------------------------------------------+
|                     USAGE METERING PIPELINE                       |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------+    +-------------+    +-------------+            |
|  |   Worker    |    |   Worker    |    |   Worker    |            |
|  +------+------+    +------+------+    +------+------+            |
|         |                  |                  |                   |
|         v                  v                  v                   |
|  +--------------------------------------------------+            |
|  |              Redis Streams                        |            |
|  |              (scrx:usage:events)                  |            |
|  +--------------------------------------------------+            |
|                           |                                       |
|                           v                                       |
|  +--------------------------------------------------+            |
|  |           Usage Aggregator Service                |            |
|  |                                                   |            |
|  |  - Consumes events from stream                   |            |
|  |  - Aggregates by org/hour                        |            |
|  |  - Buffers in memory                             |            |
|  |  - Flushes every 60 seconds                      |            |
|  +--------------------------------------------------+            |
|                           |                                       |
|          +----------------+----------------+                      |
|          |                                 |                      |
|          v                                 v                      |
|  +----------------+               +----------------+              |
|  |   PostgreSQL   |               |     Stripe     |              |
|  | usage_records  |               | Usage Records  |              |
|  +----------------+               +----------------+              |
|                                                                   |
+------------------------------------------------------------------+
```

### 6.2 Usage Event Publishing

```typescript
// services/usage-events.ts

import { Redis } from 'ioredis';

export interface UsageEvent {
  eventId: string;
  organizationId: string;
  jobId: string;
  timestamp: number;
  
  // Credits
  creditsCharged: number;
  creditBreakdown: {
    base: number;
    engine: number;
    proxy: number;
    features: number;
  };
  
  // Request details
  engine: 'http' | 'browser' | 'stealth';
  proxyType: 'datacenter' | 'residential' | 'mobile' | 'isp';
  success: boolean;
  statusCode?: number;
  
  // Features used
  features: {
    jsRendering: boolean;
    captchaSolving: boolean;
    screenshot: boolean;
    pdf: boolean;
  };
  
  // Performance
  latencyMs: number;
  bandwidthBytes: number;
}

export class UsageEventPublisher {
  private redis: Redis;
  private streamKey = 'scrx:usage:events';
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async publish(event: UsageEvent): Promise<void> {
    await this.redis.xadd(
      this.streamKey,
      'MAXLEN', '~', '100000',  // Keep ~100k events
      '*',                       // Auto-generate ID
      'data', JSON.stringify(event),
    );
  }
  
  async publishBatch(events: UsageEvent[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const event of events) {
      pipeline.xadd(
        this.streamKey,
        'MAXLEN', '~', '100000',
        '*',
        'data', JSON.stringify(event),
      );
    }
    
    await pipeline.exec();
  }
}
```

### 6.3 Usage Aggregation Service

```typescript
// services/usage-aggregator.ts

import { Redis } from 'ioredis';
import { Pool } from 'pg';

interface AggregatedUsage {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  creditsUsed: number;
  httpRequests: number;
  browserRequests: number;
  stealthRequests: number;
  datacenterRequests: number;
  residentialRequests: number;
  mobileRequests: number;
  captchaSolves: number;
  screenshotsTaken: number;
  pdfGenerated: number;
  bandwidthBytes: number;
}

export class UsageAggregator {
  private redis: Redis;
  private db: Pool;
  private buffer: Map<string, AggregatedUsage> = new Map();
  private flushInterval: NodeJS.Timeout;
  private consumerGroup = 'usage-aggregator';
  private consumerId: string;
  
  constructor(redis: Redis, db: Pool) {
    this.redis = redis;
    this.db = db;
    this.consumerId = `aggregator-${process.pid}`;
  }
  
  async start(): Promise<void> {
    // Create consumer group if not exists
    try {
      await this.redis.xgroup(
        'CREATE', 'scrx:usage:events', this.consumerGroup, '0', 'MKSTREAM',
      );
    } catch (err) {
      // Group already exists
    }
    
    // Start consuming events
    this.consumeEvents();
    
    // Flush buffer every 60 seconds
    this.flushInterval = setInterval(() => this.flush(), 60000);
  }
  
  async stop(): Promise<void> {
    clearInterval(this.flushInterval);
    await this.flush();
  }
  
  private async consumeEvents(): Promise<void> {
    while (true) {
      try {
        const results = await this.redis.xreadgroup(
          'GROUP', this.consumerGroup, this.consumerId,
          'COUNT', '100',
          'BLOCK', '5000',
          'STREAMS', 'scrx:usage:events', '>',
        );
        
        if (!results) continue;
        
        for (const [stream, messages] of results) {
          for (const [id, fields] of messages) {
            const event: UsageEvent = JSON.parse(fields[1]);
            this.aggregate(event);
            
            // Acknowledge the message
            await this.redis.xack('scrx:usage:events', this.consumerGroup, id);
          }
        }
      } catch (error) {
        console.error('Error consuming usage events:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  private aggregate(event: UsageEvent): void {
    const hourStart = new Date(event.timestamp);
    hourStart.setMinutes(0, 0, 0);
    
    const key = `${event.organizationId}:${hourStart.toISOString()}`;
    
    let agg = this.buffer.get(key);
    if (!agg) {
      agg = {
        organizationId: event.organizationId,
        periodStart: hourStart,
        periodEnd: new Date(hourStart.getTime() + 3600000),
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        creditsUsed: 0,
        httpRequests: 0,
        browserRequests: 0,
        stealthRequests: 0,
        datacenterRequests: 0,
        residentialRequests: 0,
        mobileRequests: 0,
        captchaSolves: 0,
        screenshotsTaken: 0,
        pdfGenerated: 0,
        bandwidthBytes: 0,
      };
      this.buffer.set(key, agg);
    }
    
    // Update aggregates
    agg.totalRequests++;
    agg.creditsUsed += event.creditsCharged;
    agg.bandwidthBytes += event.bandwidthBytes;
    
    if (event.success) {
      agg.successfulRequests++;
    } else {
      agg.failedRequests++;
    }
    
    // Engine breakdown
    switch (event.engine) {
      case 'http': agg.httpRequests++; break;
      case 'browser': agg.browserRequests++; break;
      case 'stealth': agg.stealthRequests++; break;
    }
    
    // Proxy breakdown
    switch (event.proxyType) {
      case 'datacenter': agg.datacenterRequests++; break;
      case 'residential': agg.residentialRequests++; break;
      case 'mobile': agg.mobileRequests++; break;
    }
    
    // Features
    if (event.features.captchaSolving) agg.captchaSolves++;
    if (event.features.screenshot) agg.screenshotsTaken++;
    if (event.features.pdf) agg.pdfGenerated++;
  }
  
  private async flush(): Promise<void> {
    if (this.buffer.size === 0) return;
    
    const records = Array.from(this.buffer.values());
    this.buffer.clear();
    
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const record of records) {
        // Get plan info to determine overage
        const planResult = await client.query(
          'SELECT credits_included_monthly FROM organizations WHERE id = $1',
          [record.organizationId],
        );
        
        const creditsIncluded = planResult.rows[0]?.credits_included_monthly || 0;
        
        // Get total credits used this month
        const usageResult = await client.query(`
          SELECT COALESCE(SUM(credits_used), 0) as total_used
          FROM usage_records
          WHERE organization_id = $1
            AND period_start >= DATE_TRUNC('month', $2::timestamptz)
        `, [record.organizationId, record.periodStart]);
        
        const totalUsedBefore = parseInt(usageResult.rows[0].total_used, 10);
        const totalUsedAfter = totalUsedBefore + record.creditsUsed;
        
        // Calculate overage
        let creditsIncludedUsed = record.creditsUsed;
        let creditsOverageUsed = 0;
        
        if (totalUsedBefore >= creditsIncluded) {
          // Already in overage
          creditsIncludedUsed = 0;
          creditsOverageUsed = record.creditsUsed;
        } else if (totalUsedAfter > creditsIncluded) {
          // Crossing into overage
          creditsIncludedUsed = creditsIncluded - totalUsedBefore;
          creditsOverageUsed = record.creditsUsed - creditsIncludedUsed;
        }
        
        // Upsert usage record
        await client.query(`
          INSERT INTO usage_records (
            organization_id, period_start, period_end,
            total_requests, successful_requests, failed_requests,
            credits_used, credits_included_used, credits_overage_used,
            http_requests, browser_requests, stealth_requests,
            datacenter_requests, residential_requests, mobile_requests,
            captcha_solves, screenshots_taken, pdfs_generated, bandwidth_bytes,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
          )
          ON CONFLICT (organization_id, period_start)
          DO UPDATE SET
            total_requests = usage_records.total_requests + EXCLUDED.total_requests,
            successful_requests = usage_records.successful_requests + EXCLUDED.successful_requests,
            failed_requests = usage_records.failed_requests + EXCLUDED.failed_requests,
            credits_used = usage_records.credits_used + EXCLUDED.credits_used,
            credits_included_used = usage_records.credits_included_used + EXCLUDED.credits_included_used,
            credits_overage_used = usage_records.credits_overage_used + EXCLUDED.credits_overage_used,
            http_requests = usage_records.http_requests + EXCLUDED.http_requests,
            browser_requests = usage_records.browser_requests + EXCLUDED.browser_requests,
            stealth_requests = usage_records.stealth_requests + EXCLUDED.stealth_requests,
            datacenter_requests = usage_records.datacenter_requests + EXCLUDED.datacenter_requests,
            residential_requests = usage_records.residential_requests + EXCLUDED.residential_requests,
            mobile_requests = usage_records.mobile_requests + EXCLUDED.mobile_requests,
            captcha_solves = usage_records.captcha_solves + EXCLUDED.captcha_solves,
            screenshots_taken = usage_records.screenshots_taken + EXCLUDED.screenshots_taken,
            pdfs_generated = usage_records.pdfs_generated + EXCLUDED.pdfs_generated,
            bandwidth_bytes = usage_records.bandwidth_bytes + EXCLUDED.bandwidth_bytes,
            updated_at = NOW()
        `, [
          record.organizationId, record.periodStart, record.periodEnd,
          record.totalRequests, record.successfulRequests, record.failedRequests,
          record.creditsUsed, creditsIncludedUsed, creditsOverageUsed,
          record.httpRequests, record.browserRequests, record.stealthRequests,
          record.datacenterRequests, record.residentialRequests, record.mobileRequests,
          record.captchaSolves, record.screenshotsTaken, record.pdfGenerated, record.bandwidthBytes,
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### 6.4 Usage API Endpoints

```typescript
// api/routes/usage.ts

import { FastifyInstance } from 'fastify';

export async function usageRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current usage summary
  fastify.get('/v1/usage', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            period: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' },
              },
            },
            credits: {
              type: 'object',
              properties: {
                included: { type: 'integer' },
                used: { type: 'integer' },
                remaining: { type: 'integer' },
                overage: { type: 'integer' },
                percentUsed: { type: 'number' },
              },
            },
            requests: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                successful: { type: 'integer' },
                failed: { type: 'integer' },
                successRate: { type: 'number' },
              },
            },
            breakdown: {
              type: 'object',
              properties: {
                byEngine: {
                  type: 'object',
                  properties: {
                    http: { type: 'integer' },
                    browser: { type: 'integer' },
                    stealth: { type: 'integer' },
                  },
                },
                byProxy: {
                  type: 'object',
                  properties: {
                    datacenter: { type: 'integer' },
                    residential: { type: 'integer' },
                    mobile: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const org = request.organization;
    
    // Get current billing period
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    
    // Aggregate usage for period
    const usage = await request.db.query(`
      SELECT 
        COALESCE(SUM(total_requests), 0) as total_requests,
        COALESCE(SUM(successful_requests), 0) as successful_requests,
        COALESCE(SUM(failed_requests), 0) as failed_requests,
        COALESCE(SUM(credits_used), 0) as credits_used,
        COALESCE(SUM(credits_included_used), 0) as credits_included_used,
        COALESCE(SUM(credits_overage_used), 0) as credits_overage_used,
        COALESCE(SUM(http_requests), 0) as http_requests,
        COALESCE(SUM(browser_requests), 0) as browser_requests,
        COALESCE(SUM(stealth_requests), 0) as stealth_requests,
        COALESCE(SUM(datacenter_requests), 0) as datacenter_requests,
        COALESCE(SUM(residential_requests), 0) as residential_requests,
        COALESCE(SUM(mobile_requests), 0) as mobile_requests
      FROM usage_records
      WHERE organization_id = $1
        AND period_start >= $2
        AND period_start < $3
    `, [org.id, periodStart, periodEnd]);
    
    const u = usage.rows[0];
    const creditsIncluded = org.credits_included_monthly;
    const creditsUsed = parseInt(u.credits_used, 10);
    
    return {
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      credits: {
        included: creditsIncluded,
        used: creditsUsed,
        remaining: Math.max(0, creditsIncluded - creditsUsed),
        overage: parseInt(u.credits_overage_used, 10),
        percentUsed: (creditsUsed / creditsIncluded) * 100,
      },
      requests: {
        total: parseInt(u.total_requests, 10),
        successful: parseInt(u.successful_requests, 10),
        failed: parseInt(u.failed_requests, 10),
        successRate: parseInt(u.total_requests, 10) > 0
          ? (parseInt(u.successful_requests, 10) / parseInt(u.total_requests, 10)) * 100
          : 100,
      },
      breakdown: {
        byEngine: {
          http: parseInt(u.http_requests, 10),
          browser: parseInt(u.browser_requests, 10),
          stealth: parseInt(u.stealth_requests, 10),
        },
        byProxy: {
          datacenter: parseInt(u.datacenter_requests, 10),
          residential: parseInt(u.residential_requests, 10),
          mobile: parseInt(u.mobile_requests, 10),
        },
      },
    };
  });
  
  // Get usage history
  fastify.get('/v1/usage/history', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date' },
          end: { type: 'string', format: 'date' },
          granularity: { type: 'string', enum: ['hour', 'day', 'month'] },
        },
      },
    },
  }, async (request, reply) => {
    const org = request.organization;
    const { start, end, granularity = 'day' } = request.query as any;
    
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    
    const truncFunc = granularity === 'hour' ? 'hour' 
      : granularity === 'month' ? 'month' 
      : 'day';
    
    const history = await request.db.query(`
      SELECT 
        DATE_TRUNC($1, period_start) as period,
        SUM(total_requests) as requests,
        SUM(credits_used) as credits,
        SUM(successful_requests)::float / NULLIF(SUM(total_requests), 0) * 100 as success_rate
      FROM usage_records
      WHERE organization_id = $2
        AND period_start >= $3
        AND period_start < $4
      GROUP BY DATE_TRUNC($1, period_start)
      ORDER BY period ASC
    `, [truncFunc, org.id, startDate, endDate]);
    
    return {
      granularity,
      data: history.rows.map(row => ({
        period: row.period,
        requests: parseInt(row.requests, 10),
        credits: parseInt(row.credits, 10),
        successRate: parseFloat(row.success_rate) || 100,
      })),
    };
  });
}
```

---

## 7. Billing Workflows

### 7.1 New Customer Onboarding

```typescript
// workflows/onboarding.ts

import { StripeService } from '../services/stripe';
import { PLANS } from '../config/plans';

interface OnboardingInput {
  email: string;
  name: string;
  organizationName: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
}

export async function onboardNewCustomer(
  input: OnboardingInput,
  stripeService: StripeService,
  db: Pool,
): Promise<{
  organization: Organization;
  user: User;
  checkoutUrl: string;
}> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create organization
    const orgResult = await client.query(`
      INSERT INTO organizations (name, slug, billing_email, plan_id, subscription_status)
      VALUES ($1, $2, $3, 'trial', 'trialing')
      RETURNING *
    `, [input.organizationName, generateSlug(input.organizationName), input.email]);
    
    const org = orgResult.rows[0];
    
    // Create user
    const userResult = await client.query(`
      INSERT INTO users (organization_id, email, role)
      VALUES ($1, $2, 'owner')
      RETURNING *
    `, [org.id, input.email]);
    
    const user = userResult.rows[0];
    
    // Create Stripe customer
    const stripeCustomer = await stripeService.createCustomer({
      email: input.email,
      name: input.name,
      organizationId: org.id,
    });
    
    // Update org with Stripe customer ID
    await client.query(`
      UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2
    `, [stripeCustomer.id, org.id]);
    
    // Create API key for trial
    const apiKey = generateApiKey();
    await client.query(`
      INSERT INTO api_keys (organization_id, created_by_user_id, key_prefix, key_hash, name, environment)
      VALUES ($1, $2, $3, $4, 'Default Key', 'production')
    `, [org.id, user.id, apiKey.prefix, hashApiKey(apiKey.full)]);
    
    await client.query('COMMIT');
    
    // Create checkout session
    const checkoutSession = await stripeService.createCheckoutSession(
      stripeCustomer.id,
      input.planId,
      input.billingCycle,
      `https://app.scrapifie.io/onboarding/complete?session_id={CHECKOUT_SESSION_ID}`,
      `https://app.scrapifie.io/onboarding/canceled`,
    );
    
    return {
      organization: org,
      user,
      checkoutUrl: checkoutSession.url!,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 7.2 Plan Upgrade/Downgrade

```typescript
// workflows/plan-change.ts

interface PlanChangeResult {
  success: boolean;
  subscription: Subscription;
  creditsAdjustment: number;
  proration: number;
}

export async function changePlan(
  organizationId: string,
  newPlanId: string,
  stripeService: StripeService,
  db: Pool,
): Promise<PlanChangeResult> {
  // Get current subscription
  const orgResult = await db.query(`
    SELECT o.*, s.stripe_subscription_id, s.plan_id as current_plan_id
    FROM organizations o
    JOIN subscriptions s ON s.organization_id = o.id
    WHERE o.id = $1 AND s.status = 'active'
  `, [organizationId]);
  
  const org = orgResult.rows[0];
  const currentPlan = PLANS[org.current_plan_id];
  const newPlan = PLANS[newPlanId];
  
  // Determine if upgrade or downgrade
  const isUpgrade = newPlan.priceMonthly > currentPlan.priceMonthly;
  
  // Get new price ID (keep same billing cycle)
  const subscriptionResult = await db.query(
    'SELECT billing_cycle FROM subscriptions WHERE organization_id = $1 AND status = $2',
    [organizationId, 'active'],
  );
  const billingCycle = subscriptionResult.rows[0].billing_cycle;
  const newPriceId = billingCycle === 'yearly' 
    ? newPlan.stripePriceIdYearly 
    : newPlan.stripePriceIdMonthly;
  
  // Update subscription in Stripe
  const updatedSubscription = await stripeService.updateSubscription(
    org.stripe_subscription_id,
    newPriceId,
    isUpgrade, // Prorate for upgrades, not for downgrades
  );
  
  // Calculate credits adjustment
  let creditsAdjustment = 0;
  if (isUpgrade) {
    // Give additional credits immediately
    creditsAdjustment = newPlan.creditsIncluded - currentPlan.creditsIncluded;
  }
  // For downgrades, credits will reset at next billing cycle
  
  // Update database
  await db.query(`
    UPDATE organizations SET
      plan_id = $1,
      credits_included_monthly = $2,
      credits_balance = credits_balance + $3,
      rate_limit_per_second = $4,
      max_concurrent_jobs = $5,
      updated_at = NOW()
    WHERE id = $6
  `, [
    newPlanId,
    newPlan.creditsIncluded,
    creditsAdjustment,
    newPlan.limits.ratePerSecond,
    newPlan.limits.maxConcurrent,
    organizationId,
  ]);
  
  // Get proration amount from upcoming invoice
  const upcomingInvoice = await stripeService.getUpcomingInvoice(org.stripe_customer_id);
  const proration = upcomingInvoice.lines.data
    .filter(line => line.proration)
    .reduce((sum, line) => sum + line.amount, 0);
  
  return {
    success: true,
    subscription: updatedSubscription,
    creditsAdjustment,
    proration,
  };
}
```

### 7.3 Subscription Cancellation

```typescript
// workflows/cancellation.ts

interface CancellationResult {
  subscription: Subscription;
  effectiveDate: Date;
  refundAmount?: number;
}

export async function cancelSubscription(
  organizationId: string,
  reason: string,
  immediately: boolean = false,
  stripeService: StripeService,
  db: Pool,
): Promise<CancellationResult> {
  // Get subscription
  const result = await db.query(`
    SELECT o.stripe_subscription_id, o.stripe_customer_id, s.current_period_end
    FROM organizations o
    JOIN subscriptions s ON s.organization_id = o.id
    WHERE o.id = $1 AND s.status = 'active'
  `, [organizationId]);
  
  const org = result.rows[0];
  
  // Cancel in Stripe
  const canceledSubscription = await stripeService.cancelSubscription(
    org.stripe_subscription_id,
    immediately,
  );
  
  // Calculate effective date
  const effectiveDate = immediately 
    ? new Date() 
    : new Date(canceledSubscription.current_period_end * 1000);
  
  // Update database
  await db.query(`
    UPDATE subscriptions SET
      cancel_at_period_end = $1,
      canceled_at = NOW(),
      updated_at = NOW()
    WHERE organization_id = $2 AND status = 'active'
  `, [!immediately, organizationId]);
  
  // Record cancellation reason
  await db.query(`
    INSERT INTO cancellation_reasons (organization_id, reason, created_at)
    VALUES ($1, $2, NOW())
  `, [organizationId, reason]);
  
  // If immediate, update org to free plan
  if (immediately) {
    await db.query(`
      UPDATE organizations SET
        plan_id = 'free',
        subscription_status = 'canceled',
        credits_included_monthly = 0,
        rate_limit_per_second = 1,
        max_concurrent_jobs = 1,
        updated_at = NOW()
      WHERE id = $1
    `, [organizationId]);
  }
  
  return {
    subscription: canceledSubscription,
    effectiveDate,
  };
}
```

---

## 8. Revenue Analytics

### 8.1 Key Metrics Dashboard

```typescript
// services/revenue-analytics.ts

interface RevenueMetrics {
  mrr: number;                    // Monthly Recurring Revenue
  arr: number;                    // Annual Recurring Revenue
  activeSubscriptions: number;
  newSubscriptions: number;
  churnedSubscriptions: number;
  netMrrChange: number;
  expansionMrr: number;          // Upgrades
  contractionMrr: number;        // Downgrades
  arpu: number;                   // Average Revenue Per User
  ltv: number;                    // Lifetime Value
}

export async function getRevenueMetrics(
  db: Pool,
  startDate: Date,
  endDate: Date,
): Promise<RevenueMetrics> {
  // Get current MRR
  const mrrResult = await db.query(`
    SELECT 
      SUM(
        CASE 
          WHEN billing_cycle = 'yearly' THEN base_price_cents / 12
          ELSE base_price_cents
        END
      ) as mrr
    FROM subscriptions
    WHERE status = 'active'
  `);
  
  const mrr = parseInt(mrrResult.rows[0].mrr || '0', 10);
  
  // Get subscription counts
  const countsResult = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $2) as new,
      COUNT(*) FILTER (WHERE canceled_at >= $1 AND canceled_at < $2) as churned
    FROM subscriptions
  `, [startDate, endDate]);
  
  const counts = countsResult.rows[0];
  
  // Calculate expansion/contraction MRR
  const changeResult = await db.query(`
    WITH plan_changes AS (
      SELECT 
        organization_id,
        LAG(base_price_cents) OVER (PARTITION BY organization_id ORDER BY created_at) as prev_price,
        base_price_cents as curr_price,
        billing_cycle
      FROM subscriptions
      WHERE updated_at >= $1 AND updated_at < $2
    )
    SELECT
      SUM(CASE 
        WHEN curr_price > prev_price THEN
          CASE WHEN billing_cycle = 'yearly' THEN (curr_price - prev_price) / 12 ELSE curr_price - prev_price END
        ELSE 0 
      END) as expansion,
      SUM(CASE 
        WHEN curr_price < prev_price THEN
          CASE WHEN billing_cycle = 'yearly' THEN (prev_price - curr_price) / 12 ELSE prev_price - curr_price END
        ELSE 0 
      END) as contraction
    FROM plan_changes
    WHERE prev_price IS NOT NULL
  `, [startDate, endDate]);
  
  const changes = changeResult.rows[0];
  
  // Calculate ARPU
  const activeSubscriptions = parseInt(counts.active, 10);
  const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;
  
  // Estimate LTV (using 24-month average tenure assumption)
  const avgTenureMonths = 24;
  const ltv = arpu * avgTenureMonths;
  
  // New MRR from new subscriptions
  const newMrrResult = await db.query(`
    SELECT SUM(
      CASE 
        WHEN billing_cycle = 'yearly' THEN base_price_cents / 12
        ELSE base_price_cents
      END
    ) as new_mrr
    FROM subscriptions
    WHERE created_at >= $1 AND created_at < $2
  `, [startDate, endDate]);
  
  // Churned MRR
  const churnedMrrResult = await db.query(`
    SELECT SUM(
      CASE 
        WHEN billing_cycle = 'yearly' THEN base_price_cents / 12
        ELSE base_price_cents
      END
    ) as churned_mrr
    FROM subscriptions
    WHERE canceled_at >= $1 AND canceled_at < $2
  `, [startDate, endDate]);
  
  const newMrr = parseInt(newMrrResult.rows[0].new_mrr || '0', 10);
  const churnedMrr = parseInt(churnedMrrResult.rows[0].churned_mrr || '0', 10);
  const expansionMrr = parseInt(changes.expansion || '0', 10);
  const contractionMrr = parseInt(changes.contraction || '0', 10);
  
  const netMrrChange = newMrr + expansionMrr - churnedMrr - contractionMrr;
  
  return {
    mrr,
    arr: mrr * 12,
    activeSubscriptions,
    newSubscriptions: parseInt(counts.new, 10),
    churnedSubscriptions: parseInt(counts.churned, 10),
    netMrrChange,
    expansionMrr,
    contractionMrr,
    arpu,
    ltv,
  };
}
```

### 8.2 Revenue by Plan Report

```sql
-- Revenue breakdown by plan
SELECT 
    s.plan_id,
    s.plan_name,
    COUNT(*) as subscription_count,
    SUM(CASE 
        WHEN s.billing_cycle = 'yearly' THEN s.base_price_cents / 12
        ELSE s.base_price_cents
    END) as mrr_cents,
    SUM(CASE 
        WHEN s.billing_cycle = 'yearly' THEN s.base_price_cents
        ELSE s.base_price_cents * 12
    END) as arr_cents,
    AVG(CASE 
        WHEN s.billing_cycle = 'yearly' THEN s.base_price_cents / 12
        ELSE s.base_price_cents
    END) as avg_mrr_per_sub
FROM subscriptions s
WHERE s.status = 'active'
GROUP BY s.plan_id, s.plan_name
ORDER BY mrr_cents DESC;

-- Cohort analysis
WITH cohorts AS (
    SELECT 
        o.id,
        DATE_TRUNC('month', o.created_at) as cohort_month,
        s.base_price_cents,
        s.billing_cycle,
        s.canceled_at
    FROM organizations o
    JOIN subscriptions s ON s.organization_id = o.id
)
SELECT 
    cohort_month,
    COUNT(*) as cohort_size,
    COUNT(*) FILTER (WHERE canceled_at IS NULL) as active_count,
    (COUNT(*) FILTER (WHERE canceled_at IS NULL))::float / COUNT(*) * 100 as retention_pct,
    SUM(CASE 
        WHEN canceled_at IS NULL AND billing_cycle = 'yearly' THEN base_price_cents / 12
        WHEN canceled_at IS NULL THEN base_price_cents
        ELSE 0
    END) as current_mrr
FROM cohorts
GROUP BY cohort_month
ORDER BY cohort_month;
```

---

## 9. Compliance and Taxation

### 9.1 Tax Calculation with Stripe Tax

```typescript
// services/tax.ts

import Stripe from 'stripe';
import { stripe } from '../config/stripe';

interface TaxCalculation {
  amount: number;
  taxableAmount: number;
  taxAmount: number;
  taxRate: number;
  jurisdiction: string;
  taxType: string;
}

export async function calculateTax(
  customerId: string,
  amount: number,
  currency: string = 'usd',
): Promise<TaxCalculation> {
  // Get customer for location
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw new Error('Customer not found');
  
  // Use Stripe Tax for automatic calculation
  const taxCalculation = await stripe.tax.calculations.create({
    currency,
    line_items: [
      {
        amount,
        reference: 'subscription',
        tax_behavior: 'exclusive',
        tax_code: 'txcd_10103000', // Software as a service
      },
    ],
    customer_details: {
      address: customer.address || undefined,
      address_source: 'billing',
    },
  });
  
  const taxBreakdown = taxCalculation.tax_breakdown?.[0];
  
  return {
    amount: taxCalculation.amount_total,
    taxableAmount: amount,
    taxAmount: taxCalculation.tax_amount_exclusive,
    taxRate: taxBreakdown?.tax_rate_details?.percentage_decimal 
      ? parseFloat(taxBreakdown.tax_rate_details.percentage_decimal) 
      : 0,
    jurisdiction: taxBreakdown?.jurisdiction?.display_name || 'Unknown',
    taxType: taxBreakdown?.taxability_reason || 'taxable',
  };
}

// Tax-exempt customer handling
export async function setTaxExempt(
  customerId: string,
  exempt: boolean,
  exemptionNumber?: string,
): Promise<void> {
  await stripe.customers.update(customerId, {
    tax_exempt: exempt ? 'exempt' : 'none',
    metadata: exemptionNumber ? { tax_exemption_number: exemptionNumber } : {},
  });
}
```

### 9.2 Invoice Requirements

```typescript
// services/invoicing.ts

interface InvoiceRequirements {
  showTaxId: boolean;
  showVat: boolean;
  showGst: boolean;
  requirePo: boolean;
  customFields: { name: string; value: string }[];
}

export function getInvoiceRequirements(country: string): InvoiceRequirements {
  // EU VAT requirements
  const euCountries = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ]);
  
  const isEu = euCountries.has(country);
  
  return {
    showTaxId: true,
    showVat: isEu || country === 'GB',
    showGst: country === 'AU' || country === 'NZ' || country === 'IN',
    requirePo: false, // Enterprise customers might require PO numbers
    customFields: [
      { name: 'Service Period', value: '' },
      { name: 'Payment Terms', value: 'Net 30' },
    ],
  };
}

// Generate PDF invoice
export async function generateInvoicePdf(
  invoiceId: string,
  db: Pool,
): Promise<Buffer> {
  const invoice = await db.query(`
    SELECT i.*, o.name as org_name, o.billing_email
    FROM invoices i
    JOIN organizations o ON o.id = i.organization_id
    WHERE i.id = $1
  `, [invoiceId]);
  
  // Use a PDF library like PDFKit or puppeteer
  // This is a placeholder for the actual implementation
  const pdfContent = await renderInvoiceTemplate(invoice.rows[0]);
  return pdfContent;
}
```

---

## 10. Appendix

### 10.1 Credit Calculation Examples

| Scenario | Engine | Proxy | Features | Calculation | Total |
|----------|--------|-------|----------|-------------|-------|
| Simple scrape | HTTP (1x) | Datacenter (1x) | None | 1 * 1 * 1 | 1 credit |
| JS rendering | Browser (5x) | Datacenter (1x) | None | 1 * 5 * 1 | 5 credits |
| JS + Screenshot | Browser (5x) | Datacenter (1x) | Screenshot (+2) | (1 * 5 * 1) + 2 | 7 credits |
| Stealth mode | Stealth (10x) | Datacenter (1x) | None | 1 * 10 * 1 | 10 credits |
| Residential | HTTP (1x) | Residential (4x) | None | 1 * 1 * 4 | 4 credits |
| Stealth + Resi | Stealth (10x) | Residential (4x) | None | 1 * 10 * 4 | 40 credits |
| Full stack | Stealth (10x) | Mobile (11x) | CAPTCHA (+10), Screenshot (+2) | (1 * 10 * 11) + 10 + 2 | 122 credits |

### 10.2 Stripe Product Setup Script

```typescript
// scripts/setup-stripe-products.ts

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function setupStripeProducts() {
  // Create products
  const products = await Promise.all([
    stripe.products.create({
      name: 'Scrapifie Starter',
      description: '100K credits/month, 10 req/sec',
      metadata: { plan_id: 'starter' },
    }),
    stripe.products.create({
      name: 'Scrapifie Growth',
      description: '500K credits/month, 50 req/sec',
      metadata: { plan_id: 'growth' },
    }),
    stripe.products.create({
      name: 'Scrapifie Business',
      description: '2M credits/month, 200 req/sec',
      metadata: { plan_id: 'business' },
    }),
  ]);
  
  // Create prices
  for (const product of products) {
    const planId = product.metadata.plan_id;
    const prices = {
      starter: { monthly: 4900, yearly: 47000 },
      growth: { monthly: 14900, yearly: 143000 },
      business: { monthly: 34900, yearly: 335000 },
    };
    
    // Monthly price
    await stripe.prices.create({
      product: product.id,
      unit_amount: prices[planId].monthly,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan_id: planId, billing_cycle: 'monthly' },
    });
    
    // Yearly price
    await stripe.prices.create({
      product: product.id,
      unit_amount: prices[planId].yearly,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { plan_id: planId, billing_cycle: 'yearly' },
    });
  }
  
  // Create overage prices (metered)
  const overageRates = {
    starter: 50,   // $0.05 per 1,000 credits
    growth: 40,    // $0.04 per 1,000 credits
    business: 30,  // $0.03 per 1,000 credits
  };
  
  for (const [planId, rate] of Object.entries(overageRates)) {
    await stripe.prices.create({
      product: products.find(p => p.metadata.plan_id === planId)!.id,
      unit_amount: rate,
      currency: 'usd',
      recurring: {
        interval: 'month',
        usage_type: 'metered',
        aggregate_usage: 'sum',
      },
      transform_quantity: {
        divide_by: 1000,
        round: 'up',
      },
      metadata: { plan_id: planId, type: 'overage' },
    });
  }
  
  console.log('Stripe products and prices created successfully');
}

setupStripeProducts().catch(console.error);
```

### 10.3 Billing FAQ

| Question | Answer |
|----------|--------|
| When do credits reset? | Credits reset at the start of each billing cycle |
| What happens to unused credits? | Unused credits do not roll over to the next month |
| How is overage calculated? | Overage is calculated per 1,000 credits over the plan limit |
| Can I change plans mid-cycle? | Yes, upgrades are prorated and take effect immediately |
| When does downgrade take effect? | Downgrades take effect at the start of the next billing cycle |
| Is there a refund policy? | No refunds for partial months; contact support for special cases |
| How are failed requests charged? | Failed requests are not charged |
| What payment methods are accepted? | Credit/debit cards, ACH (US), SEPA (EU) |

---

## Document Control

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-31 | Product Team | Initial release |

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | | | |
| Engineering Lead | | | |
| Finance Review | | | |

### Distribution

This document is approved for internal distribution to the Scrapifie product, engineering, and finance teams.
