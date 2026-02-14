-- Migration: Create status page tables for service status and incident management
-- Phase 10: Admin Dashboard
-- Created: 2026-02-10

CREATE TYPE service_status AS ENUM (
  'operational',
  'degraded_performance',
  'partial_outage',
  'major_outage',
  'under_maintenance'
);

CREATE TYPE incident_status AS ENUM (
  'investigating',
  'identified',
  'monitoring',
  'resolved'
);

CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Service status tracking
CREATE TABLE IF NOT EXISTS service_status_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Service identification
  service_name VARCHAR(100) NOT NULL UNIQUE,
  service_display_name VARCHAR(150) NOT NULL,
  description TEXT,
  
  -- Status
  status service_status NOT NULL DEFAULT 'operational',
  
  -- Display order
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidents
CREATE TABLE IF NOT EXISTS status_incident (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Incident details
  title VARCHAR(255) NOT NULL,
  status incident_status NOT NULL DEFAULT 'investigating',
  severity incident_severity NOT NULL DEFAULT 'medium',
  
  -- Affected services
  affected_services TEXT[] DEFAULT '{}', -- Array of service_name values
  
  -- Timeline
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Created by
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incident updates
CREATE TABLE IF NOT EXISTS status_incident_update (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Incident reference
  incident_id UUID NOT NULL REFERENCES status_incident(id) ON DELETE CASCADE,
  
  -- Update details
  message TEXT NOT NULL,
  status incident_status NOT NULL,
  
  -- Author
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for service_status_config
CREATE INDEX idx_service_status_config_status ON service_status_config(status);
CREATE INDEX idx_service_status_config_display_order ON service_status_config(display_order);

-- Indexes for status_incident
CREATE INDEX idx_status_incident_status ON status_incident(status);
CREATE INDEX idx_status_incident_severity ON status_incident(severity);
CREATE INDEX idx_status_incident_started_at ON status_incident(started_at DESC);
CREATE INDEX idx_status_incident_resolved_at ON status_incident(resolved_at DESC);

-- Index for affected services search
CREATE INDEX idx_status_incident_affected_services ON status_incident USING GIN(affected_services);

-- Indexes for status_incident_update
CREATE INDEX idx_status_incident_update_incident_id ON status_incident_update(incident_id, created_at ASC);

-- Update timestamp triggers
CREATE TRIGGER update_service_status_config_timestamp
  BEFORE UPDATE ON service_status_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_incident_timestamp
  BEFORE UPDATE ON status_incident
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default services
INSERT INTO service_status_config (service_name, service_display_name, description, display_order) VALUES
  ('api', 'API', 'Core scraping API endpoints', 1),
  ('dashboard', 'Dashboard', 'User dashboard and web interface', 2),
  ('billing', 'Billing', 'Payment processing and subscription management', 3),
  ('support', 'Support', 'Support ticket system', 4),
  ('docs', 'Documentation', 'API documentation portal', 5)
ON CONFLICT (service_name) DO NOTHING;

-- Comments
COMMENT ON TABLE service_status_config IS 'Configuration for service status tracking displayed on status page';
COMMENT ON TABLE status_incident IS 'Active and historical incidents affecting platform services';
COMMENT ON TABLE status_incident_update IS 'Timeline updates for incidents';
COMMENT ON COLUMN status_incident.affected_services IS 'Array of service names affected by this incident';
