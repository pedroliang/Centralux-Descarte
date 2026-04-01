-- Add observacao column to descartes table
ALTER TABLE descartes ADD COLUMN IF NOT EXISTS observacao text;
