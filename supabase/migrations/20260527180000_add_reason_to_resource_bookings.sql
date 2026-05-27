-- Add reason column to resource_bookings table
ALTER TABLE public.resource_bookings
ADD COLUMN reason text;

-- Add comment to document the purpose
COMMENT ON COLUMN public.resource_bookings.reason IS 'Reason or purpose for the resource booking. Required for standalone bookings (tour_id = NULL).';
