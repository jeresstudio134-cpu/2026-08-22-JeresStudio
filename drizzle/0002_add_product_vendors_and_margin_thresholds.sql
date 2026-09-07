-- Jeres Studio - Neon PostgreSQL Migration
-- Migration 0002: Add product_vendors table and margin threshold settings

CREATE TABLE IF NOT EXISTS "product_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
	"vendor_id" integer NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
	"harga_modal" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Extend vendors table with kontak and updated_at if not exists
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "kontak" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Extend store_settings with margin thresholds
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "margin_threshold_good" varchar(10) DEFAULT '20';
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "margin_threshold_warning" varchar(10) DEFAULT '10';
