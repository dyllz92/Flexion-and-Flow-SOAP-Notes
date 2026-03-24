-- Migration: Add pdf_url column to soap_notes table
ALTER TABLE soap_notes ADD COLUMN pdf_url TEXT;