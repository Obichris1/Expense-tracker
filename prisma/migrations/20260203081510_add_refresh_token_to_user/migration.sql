-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshToken" TEXT;

-- CreateTable
CREATE TABLE "admin" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);
