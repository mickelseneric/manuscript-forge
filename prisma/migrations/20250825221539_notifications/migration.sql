/*
  Warnings:

  - A unique constraint covering the columns `[userId,eventId]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventId` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "eventId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_eventId_key" ON "Notification"("userId", "eventId");
