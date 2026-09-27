-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "slotDate" SET DATA TYPE DATE;

-- CreateTable
CREATE TABLE "slot_bookings" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "booked" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "slot_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slot_bookings_slotId_date_key" ON "slot_bookings"("slotId", "date");

-- AddForeignKey
ALTER TABLE "slot_bookings" ADD CONSTRAINT "slot_bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "delivery_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
