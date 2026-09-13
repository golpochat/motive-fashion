-- MFA fields for TOTP setup. emailVerified already exists on User.
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaBackupHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "User" SET "emailVerified" = true WHERE email IN (
  'superadmin@motivefashion.com',
  'floor@motivefashion.ie',
  'guest@motivefashion.ie'
);
