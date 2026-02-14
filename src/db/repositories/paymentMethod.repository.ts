// Payment Method Repository
// Phase 8: Billing and Credits
// Created: 2026-02-10

import { pool } from '../index.js';
import { PaymentMethod, PaymentMethodType } from '../../types/index.js';

export class PaymentMethodRepository {
  async create(data: {
    accountId: string;
    stripePaymentMethodId: string;
    type: PaymentMethodType;
    isDefault?: boolean;
    cardBrand?: string;
    cardLast4?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    bankName?: string;
    bankLast4?: string;
    billingName?: string;
    billingEmail?: string;
    billingAddressLine1?: string;
    billingAddressLine2?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    billingCountry?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentMethod> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (data.isDefault) {
        await client.query(
          'UPDATE payment_method SET is_default = FALSE WHERE account_id = $1',
          [data.accountId]
        );
      }

      const result = await client.query<PaymentMethod>(
        `INSERT INTO payment_method (
          account_id, stripe_payment_method_id, type, is_default,
          card_brand, card_last4, card_exp_month, card_exp_year,
          bank_name, bank_last4, billing_name, billing_email,
          billing_address_line1, billing_address_line2, billing_city,
          billing_state, billing_postal_code, billing_country, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING 
          id, account_id AS "accountId", stripe_payment_method_id AS "stripePaymentMethodId",
          type, is_default AS "isDefault", card_brand AS "cardBrand", card_last4 AS "cardLast4",
          card_exp_month AS "cardExpMonth", card_exp_year AS "cardExpYear",
          bank_name AS "bankName", bank_last4 AS "bankLast4",
          billing_name AS "billingName", billing_email AS "billingEmail",
          billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
          billing_city AS "billingCity", billing_state AS "billingState",
          billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
          metadata, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          data.accountId,
          data.stripePaymentMethodId,
          data.type,
          data.isDefault || false,
          data.cardBrand || null,
          data.cardLast4 || null,
          data.cardExpMonth || null,
          data.cardExpYear || null,
          data.bankName || null,
          data.bankLast4 || null,
          data.billingName || null,
          data.billingEmail || null,
          data.billingAddressLine1 || null,
          data.billingAddressLine2 || null,
          data.billingCity || null,
          data.billingState || null,
          data.billingPostalCode || null,
          data.billingCountry || null,
          JSON.stringify(data.metadata || {}),
        ]
      );

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByAccountId(accountId: string): Promise<PaymentMethod[]> {
    const result = await pool.query<PaymentMethod>(
      `SELECT 
        id, account_id AS "accountId", stripe_payment_method_id AS "stripePaymentMethodId",
        type, is_default AS "isDefault", card_brand AS "cardBrand", card_last4 AS "cardLast4",
        card_exp_month AS "cardExpMonth", card_exp_year AS "cardExpYear",
        bank_name AS "bankName", bank_last4 AS "bankLast4",
        billing_name AS "billingName", billing_email AS "billingEmail",
        billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
        billing_city AS "billingCity", billing_state AS "billingState",
        billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
        metadata, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM payment_method
      WHERE account_id = $1
      ORDER BY is_default DESC, created_at DESC`,
      [accountId]
    );

    return result.rows;
  }

  async findById(id: string): Promise<PaymentMethod | null> {
    const result = await pool.query<PaymentMethod>(
      `SELECT 
        id, account_id AS "accountId", stripe_payment_method_id AS "stripePaymentMethodId",
        type, is_default AS "isDefault", card_brand AS "cardBrand", card_last4 AS "cardLast4",
        card_exp_month AS "cardExpMonth", card_exp_year AS "cardExpYear",
        bank_name AS "bankName", bank_last4 AS "bankLast4",
        billing_name AS "billingName", billing_email AS "billingEmail",
        billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
        billing_city AS "billingCity", billing_state AS "billingState",
        billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
        metadata, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM payment_method
      WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async findDefaultByAccountId(accountId: string): Promise<PaymentMethod | null> {
    const result = await pool.query<PaymentMethod>(
      `SELECT 
        id, account_id AS "accountId", stripe_payment_method_id AS "stripePaymentMethodId",
        type, is_default AS "isDefault", card_brand AS "cardBrand", card_last4 AS "cardLast4",
        card_exp_month AS "cardExpMonth", card_exp_year AS "cardExpYear",
        bank_name AS "bankName", bank_last4 AS "bankLast4",
        billing_name AS "billingName", billing_email AS "billingEmail",
        billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
        billing_city AS "billingCity", billing_state AS "billingState",
        billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
        metadata, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM payment_method
      WHERE account_id = $1 AND is_default = TRUE`,
      [accountId]
    );

    return result.rows[0] || null;
  }

  async setDefault(id: string, accountId: string): Promise<PaymentMethod> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE payment_method SET is_default = FALSE WHERE account_id = $1',
        [accountId]
      );

      const result = await client.query<PaymentMethod>(
        `UPDATE payment_method
        SET is_default = TRUE, updated_at = NOW()
        WHERE id = $1 AND account_id = $2
        RETURNING 
          id, account_id AS "accountId", stripe_payment_method_id AS "stripePaymentMethodId",
          type, is_default AS "isDefault", card_brand AS "cardBrand", card_last4 AS "cardLast4",
          card_exp_month AS "cardExpMonth", card_exp_year AS "cardExpYear",
          bank_name AS "bankName", bank_last4 AS "bankLast4",
          billing_name AS "billingName", billing_email AS "billingEmail",
          billing_address_line1 AS "billingAddressLine1", billing_address_line2 AS "billingAddressLine2",
          billing_city AS "billingCity", billing_state AS "billingState",
          billing_postal_code AS "billingPostalCode", billing_country AS "billingCountry",
          metadata, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [id, accountId]
      );

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM payment_method WHERE id = $1', [id]);
  }

  async deleteByStripeId(stripePaymentMethodId: string): Promise<void> {
    await pool.query('DELETE FROM payment_method WHERE stripe_payment_method_id = $1', [
      stripePaymentMethodId,
    ]);
  }
}

export const paymentMethodRepository = new PaymentMethodRepository();
