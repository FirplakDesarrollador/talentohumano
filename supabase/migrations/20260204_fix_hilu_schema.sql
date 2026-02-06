-- Add missing tool evaluation columns to HILU phases
-- These columns are required for leader evaluations (GI, TE-EE, etc.)
-- which are stored as JSONB objects mapping tool names to check status.

-- Phase I
ALTER TABLE public."fase_I" 
ADD COLUMN IF NOT EXISTS detalles jsonb;

-- Phase L
ALTER TABLE public."fase_L" 
ADD COLUMN IF NOT EXISTS detalles jsonb;

-- Phase U
ALTER TABLE public."fase_U" 
ADD COLUMN IF NOT EXISTS detalles jsonb;

-- Standardize audit columns if they are missing or incorrectly named
-- (Observation: fase_H successfully uses 'modified_by' but types.ts says 'modified_by_id')
-- The following are safety checks to ensure the application's update logic works.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fase_I' AND column_name = 'modified_by') THEN
        ALTER TABLE public."fase_I" ADD COLUMN modified_by bigint;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fase_L' AND column_name = 'modified_by') THEN
        ALTER TABLE public."fase_L" ADD COLUMN modified_by bigint;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fase_U' AND column_name = 'modified_by') THEN
        ALTER TABLE public."fase_U" ADD COLUMN modified_by bigint;
    END IF;
END $$;
