-- AlterEnum (must be separate from ALTER TABLE - PostgreSQL requires new enum values to be committed first)
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';
