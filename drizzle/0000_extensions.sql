-- Custom SQL migration file, put your code below! --
-- Extensiones que el esquema necesita antes de crearse (el índice GIN de events.search_text usa gin_trgm_ops).
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
