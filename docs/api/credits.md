# Credit System

Scrapifie uses a credit-based system to manage usage. This document explains how credits work.

## Overview

Credits provide a flexible way to:

- Control resource consumption
- Allow different pricing for different operations
- Provide usage visibility
- Enable prepaid and subscription models

## Credit Costs

Different operations cost different amounts of credits:

| Engine | Credits | Reason |
|--------|---------|--------|
| HTTP | 1 | Lightweight, fast |
| Browser | 5 | Resource-intensive |
| Stealth | 10 | Maximum resources |

### Additional Costs

Some features add to the base cost:

| Feature | Additional Credits |
|---------|-------------------|
| Screenshot | +2 |
| PDF export | +3 |
| Extended timeout (>30s) | +1 |
| Premium proxy | +2 |

## Credit Balance

### Checking Balance

Get your current balance via the account endpoint:

```bash
curl http://localhost:3000/api/v1/account \
  -H "X-API-Key: your-key"
```

Response:

```json
{
  "organization": {
    "name": "My Company",
    "credits": 9500,
    "tier": "pro"
  }
}
```

### Credit Deduction

Credits are deducted when:

1. Job is **completed** successfully
2. Job **fails** after starting (partial resources used)

Credits are NOT deducted when:

- Job is still queued
- Job is cancelled before processing starts
- Request is rejected (rate limit, validation error)

## Insufficient Credits

When credits are insufficient:

**Response**

```
HTTP/1.1 402 Payment Required
```

```json
{
  "error": "Payment Required",
  "message": "Insufficient credits. Required: 10, Available: 5",
  "statusCode": 402,
  "creditsRequired": 10,
  "creditsAvailable": 5
}
```

### Pre-flight Check

Scrapifie checks credits before queuing a job:

1. Estimate credit cost based on options
2. Verify sufficient balance
3. Reserve credits (soft hold)
4. Process job
5. Finalize deduction

## Credit Tiers

Different subscription tiers include different credit allocations:

| Tier | Monthly Credits | Credit Cost |
|------|-----------------|-------------|
| Free | 100 | N/A |
| Pro | 10,000 | $0.01/credit |
| Enterprise | 100,000+ | Custom pricing |

### Rollover

- Free tier: No rollover
- Pro tier: 20% rollover (max 1 month)
- Enterprise: Customizable

## Usage Tracking

### View Usage

```bash
curl http://localhost:3000/api/v1/account/usage \
  -H "X-API-Key: your-key"
```

Response:

```json
{
  "period": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.000Z"
  },
  "usage": {
    "creditsUsed": 3500,
    "creditsRemaining": 6500,
    "byEngine": {
      "http": 800,
      "browser": 1750,
      "stealth": 950
    },
    "byDay": [
      { "date": "2024-01-15", "credits": 150 },
      { "date": "2024-01-16", "credits": 200 }
    ]
  }
}
```

### Usage Alerts

Configure alerts when credits are low:

| Alert Level | Threshold | Action |
|-------------|-----------|--------|
| Warning | 20% remaining | Email notification |
| Critical | 5% remaining | Email + webhook |
| Depleted | 0% remaining | Email + block requests |

## Optimizing Credit Usage

### Use Auto Engine

The `auto` engine selection minimizes costs by starting with HTTP:

- Tries HTTP first (1 credit if successful)
- Only escalates when necessary
- Avoids wasting credits on simple pages

### Batch Wisely

Group related requests efficiently:

- Use consistent options for similar pages
- Avoid unnecessary features (screenshots when not needed)
- Set appropriate timeouts

### Monitor and Adjust

1. Review usage patterns regularly
2. Identify expensive operations
3. Optimize high-cost workflows
4. Consider upgrading if consistently hitting limits

## Adding Credits

### Subscription

Credits are added monthly with your subscription.

### One-Time Purchase

Additional credits can be purchased:

- Through the billing dashboard
- Via enterprise sales
- Credits are added immediately

### Promotional Credits

Promotional credits may be added for:

- New account signup
- Referral programs
- Special promotions

## Credit History

View credit transaction history:

```bash
curl http://localhost:3000/api/v1/account/credits/history \
  -H "X-API-Key: your-key"
```

Response:

```json
{
  "transactions": [
    {
      "id": "tx_abc123",
      "type": "deduction",
      "amount": -5,
      "balance": 9995,
      "description": "Scrape job: job_xyz789",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "tx_abc122",
      "type": "addition",
      "amount": 10000,
      "balance": 10000,
      "description": "Monthly allocation",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## FAQs

**Q: What happens if a job fails?**
A: Credits may still be deducted if processing started. No charge for validation errors.

**Q: Can I get refunds for failed jobs?**
A: Generally no, but contact support for recurring issues.

**Q: Do cancelled jobs use credits?**
A: Only if processing had already started.

**Q: How are credits calculated for auto engine?**
A: Based on the engine actually used, not the initial request.
