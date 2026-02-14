-- Migration: Create system_configuration table for admin-managed settings
-- Phase 10: Admin Dashboard
-- Created: 2026-02-10

CREATE TYPE config_value_type AS ENUM ('string', 'number', 'boolean', 'json');
CREATE TYPE config_category AS ENUM (
  'general',
  'api',
  'billing',
  'email',
  'security',
  'features',
  'limits',
  'maintenance'
);

CREATE TABLE IF NOT EXISTS system_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuration key
  config_key VARCHAR(100) NOT NULL UNIQUE,
  
  -- Value
  value_type config_value_type NOT NULL,
  value TEXT NOT NULL,
  
  -- Metadata
  category config_category NOT NULL DEFAULT 'general',
  description TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE, -- Hide value in UI
  is_critical BOOLEAN NOT NULL DEFAULT FALSE, -- Warn before changing
  
  -- Validation
  validation_regex VARCHAR(255), -- For string validation
  min_value NUMERIC, -- For number validation
  max_value NUMERIC, -- For number validation
  allowed_values TEXT[], -- For enum-like validation
  
  -- Change tracking
  last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_modified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_system_configuration_config_key ON system_configuration(config_key);
CREATE INDEX idx_system_configuration_category ON system_configuration(category);
CREATE INDEX idx_system_configuration_is_critical ON system_configuration(is_critical);

-- Update timestamp trigger
CREATE TRIGGER update_system_configuration_timestamp
  BEFORE UPDATE ON system_configuration
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default configurations
INSERT INTO system_configuration (config_key, value_type, value, category, description, is_critical) VALUES
  -- General
  ('platform_name', 'string', 'Scrapifie', 'general', 'Platform display name', FALSE),
  ('support_email', 'string', 'support@scrapifie.com', 'general', 'Support contact email', FALSE),
  
  -- API
  ('api_rate_limit_per_minute', 'number', '100', 'api', 'Default API rate limit per minute', TRUE),
  ('max_concurrent_jobs', 'number', '10', 'api', 'Maximum concurrent jobs per user', TRUE),
  
  -- Billing
  ('free_plan_credits', 'number', '1000', 'billing', 'Monthly credits for free plan', TRUE),
  ('pro_plan_credits', 'number', '10000', 'billing', 'Monthly credits for pro plan', TRUE),
  ('enterprise_plan_credits', 'number', '100000', 'billing', 'Monthly credits for enterprise plan', TRUE),
  
  -- Email
  ('email_from_address', 'string', 'noreply@scrapifie.com', 'email', 'From address for system emails', FALSE),
  ('email_from_name', 'string', 'Scrapifie', 'email', 'From name for system emails', FALSE),
  
  -- Security
  ('max_login_attempts', 'number', '5', 'security', 'Max failed login attempts before lockout', TRUE),
  ('session_timeout_hours', 'number', '168', 'security', 'Session timeout in hours (168 = 7 days)', TRUE),
  ('require_email_verification', 'boolean', 'true', 'security', 'Require email verification for new accounts', TRUE),
  
  -- Features
  ('registration_enabled', 'boolean', 'true', 'features', 'Allow new user registration', TRUE),
  ('support_tickets_enabled', 'boolean', 'true', 'features', 'Enable support ticket system', FALSE),
  
  -- Maintenance
  ('maintenance_mode', 'boolean', 'false', 'maintenance', 'Enable maintenance mode', TRUE),
  ('maintenance_message', 'string', 'We are performing scheduled maintenance. We will be back shortly.', 'maintenance', 'Message shown during maintenance', FALSE)
ON CONFLICT (config_key) DO NOTHING;

-- Comments
COMMENT ON TABLE system_configuration IS 'Admin-managed system configuration with validation and change tracking';
COMMENT ON COLUMN system_configuration.is_secret IS 'Hide value in UI (for API keys, passwords)';
COMMENT ON COLUMN system_configuration.is_critical IS 'Show warning before modifying (affects system behavior)';
COMMENT ON COLUMN system_configuration.validation_regex IS 'Regex pattern for validating string values';
COMMENT ON COLUMN system_configuration.allowed_values IS 'Array of allowed values for enum-like configs';
