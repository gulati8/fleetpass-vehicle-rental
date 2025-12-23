/**
 * Central export for all API hooks
 *
 * This file provides a single import point for all React Query hooks,
 * making it easier to import multiple hooks in components.
 *
 * Usage:
 * ```typescript
 * import { useVehicles, useBookings, useLogin } from '@/lib/hooks/api';
 * ```
 */

// Query Keys
export { queryKeys } from './query-keys';

// Authentication
export {
  useMe,
  useLogin,
  useSignup,
  useLogout,
} from './use-auth';

// Locations
export {
  useLocations,
  useLocation,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from './use-locations';

// Vehicles
export {
  useVehicles,
  useVehicle,
  useVehicleAvailability,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from './use-vehicles';

// Vehicle Images
export {
  useUploadVehicleImage,
  useDeleteVehicleImage,
  useSetPrimaryVehicleImage,
  useReorderVehicleImages,
} from './use-vehicle-images';

// Customers
export {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from './use-customers';

// Bookings
export {
  useBookings,
  useBooking,
  useCreateBooking,
  useUpdateBooking,
  useConfirmBooking,
  useActivateBooking,
  useCompleteBooking,
  useCancelBooking,
} from './use-bookings';

// Leads
export {
  useLeads,
  useLead,
  useCreateLead,
  useUpdateLead,
  useAssignLead,
  useConvertLead,
  useDeleteLead,
} from './use-leads';

// Deals
export {
  useDeals,
  useDeal,
  useCreateDeal,
  useUpdateDeal,
  useWinDeal,
  useLoseDeal,
  useDeleteDeal,
} from './use-deals';

// Payments
export {
  usePaymentIntent,
  useCreatePaymentIntent,
  useConfirmPayment,
  useRefundPayment,
} from './use-payments';

// KYC
export {
  useInquiry,
  useCreateInquiry,
  useSubmitGovernmentId,
  useSubmitSelfie,
  useApproveInquiry,
} from './use-kyc';

// Error Handling
export { useApiError, extractErrorMessage } from './use-api-error';
