/*
  Warnings:

  - The `currency` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SAVINGS', 'CURRENT', 'CASH', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('NGN', 'USD', 'GBP', 'EUR');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'NGN',
ADD COLUMN     "type" "AccountType" NOT NULL DEFAULT 'SAVINGS';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'NGN';
