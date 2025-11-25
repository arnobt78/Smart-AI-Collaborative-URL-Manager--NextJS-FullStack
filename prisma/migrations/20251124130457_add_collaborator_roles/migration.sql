-- AlterTable
-- Add collaboratorRoles JSON field to store role mappings: { "email@example.com": "editor" }
-- This allows fine-grained role-based permissions (owner, editor, viewer)
-- The existing collaborators array is kept for backward compatibility during migration
ALTER TABLE "lists" ADD COLUMN "collaborator_roles" JSONB DEFAULT '{}'::jsonb;

