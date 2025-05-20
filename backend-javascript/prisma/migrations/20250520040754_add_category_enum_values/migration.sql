/*
  Warnings:

  - The values [HEALTH_WELLNESS,SAVINGS_FINANCIAL] on the enum `CategoryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CategoryType_new" AS ENUM ('HOUSING_UTILITIES', 'FOOD_DINING', 'SHOPPING', 'TRAVEL', 'ENTERTAINMENT', 'HEALTH', 'TRANSPORTATION', 'EDUCATION_SUPPLIES', 'PERSONAL_LIFESTYLE', 'INCOME', 'MISCELLANEOUS');
ALTER TABLE "Category" ALTER COLUMN "title" TYPE "CategoryType_new" USING ("title"::text::"CategoryType_new");
ALTER TYPE "CategoryType" RENAME TO "CategoryType_old";
ALTER TYPE "CategoryType_new" RENAME TO "CategoryType";
DROP TYPE "CategoryType_old";
COMMIT;
