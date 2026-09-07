-- Jeres Studio - Neon PostgreSQL Migration
-- Migration: Add Share Tracking and Progress Notes columns to Orders table

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "share_token" text UNIQUE;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "share_expires_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "progress_notes" text;
