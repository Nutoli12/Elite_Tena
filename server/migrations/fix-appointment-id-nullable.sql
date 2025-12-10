-- Fix columns to be nullable for direct payments
ALTER TABLE payments ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN "doctorWallet" DROP NOT NULL;