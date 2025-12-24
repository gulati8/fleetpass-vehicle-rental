import { z } from 'zod';

/**
 * Booking form validation schema
 */
export const bookingFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  pickupLocationId: z.string().min(1, 'Pickup location is required'),
  dropoffLocationId: z.string().min(1, 'Drop-off location is required'),
  pickupDatetime: z.string().min(1, 'Pickup date and time is required'),
  dropoffDatetime: z.string().min(1, 'Drop-off date and time is required'),
  notes: z.string().optional(),
}).refine((data) => {
  // Validate pickup is before dropoff
  if (data.pickupDatetime && data.dropoffDatetime) {
    const pickup = new Date(data.pickupDatetime);
    const dropoff = new Date(data.dropoffDatetime);
    return pickup < dropoff;
  }
  return true;
}, {
  message: 'Drop-off date must be after pickup date',
  path: ['dropoffDatetime'],
}).refine((data) => {
  // Validate pickup is not in the past
  if (data.pickupDatetime) {
    const pickup = new Date(data.pickupDatetime);
    const now = new Date();
    // Allow bookings within the last hour to account for clock skew
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return pickup >= oneHourAgo;
  }
  return true;
}, {
  message: 'Pickup date cannot be in the past',
  path: ['pickupDatetime'],
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;
