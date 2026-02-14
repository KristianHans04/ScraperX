-- Migration: Create blog_post table for content management
-- Phase 10: Admin Dashboard
-- Created: 2026-02-10

CREATE TYPE blog_post_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE IF NOT EXISTS blog_post (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  
  -- Media
  featured_image_url TEXT,
  featured_image_alt TEXT,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  og_image_url TEXT,
  
  -- Publishing
  status blog_post_status NOT NULL DEFAULT 'draft',
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_blog_post_slug ON blog_post(slug);
CREATE INDEX idx_blog_post_status ON blog_post(status);
CREATE INDEX idx_blog_post_author_id ON blog_post(author_id);
CREATE INDEX idx_blog_post_published_at ON blog_post(published_at DESC);
CREATE INDEX idx_blog_post_created_at ON blog_post(created_at DESC);

-- Index for tag search
CREATE INDEX idx_blog_post_tags ON blog_post USING GIN(tags);

-- Composite index for public blog list
CREATE INDEX idx_blog_post_published ON blog_post(status, published_at DESC) WHERE status = 'published';

-- Update timestamp trigger
CREATE TRIGGER update_blog_post_timestamp
  BEFORE UPDATE ON blog_post
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_blog_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM blog_post WHERE slug = NEW.slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) LOOP
      NEW.slug := NEW.slug || '-' || floor(random() * 1000)::TEXT;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug
CREATE TRIGGER set_blog_post_slug
  BEFORE INSERT OR UPDATE ON blog_post
  FOR EACH ROW
  EXECUTE FUNCTION generate_blog_slug();

-- Comments
COMMENT ON TABLE blog_post IS 'Blog posts for marketing and content published via admin dashboard';
COMMENT ON COLUMN blog_post.slug IS 'URL-friendly identifier, auto-generated from title if not provided';
COMMENT ON COLUMN blog_post.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN blog_post.published_at IS 'When post was published (can be scheduled for future)';
