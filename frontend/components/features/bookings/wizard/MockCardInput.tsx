'use client';

import { CreditCard, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input/Input';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Badge } from '@/components/ui/badge/Badge';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { PaymentFormData } from '@/lib/validations/payment.validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentFormSchema } from '@/lib/validations/payment.validation';
import { formatCardNumber, formatExpiry } from '@/lib/utils/payment-formatting';

interface MockCardInputProps {
  /** react-hook-form register function */
  register: UseFormRegister<PaymentFormData>;
  /** Form validation errors */
  errors: FieldErrors<PaymentFormData>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MockCardInput Component
 *
 * A mock credit card input form for testing payment flows.
 * Includes automatic formatting for card number and expiry date,
 * validation via Zod schema, and a test mode warning badge.
 *
 * @example
 * ```tsx
 * const { register, formState: { errors } } = useForm<PaymentFormData>({
 *   resolver: zodResolver(paymentFormSchema),
 * });
 *
 * <MockCardInput
 *   register={register}
 *   errors={errors}
 * />
 * ```
 */
export function MockCardInput({ register, errors, className }: MockCardInputProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Payment Information</h3>
              <p className="text-sm text-neutral-600">Enter your card details</p>
            </div>
          </div>
          <Badge variant="warning" size="sm">
            Test Mode
          </Badge>
        </div>

        {/* Test Mode Warning */}
        <div className="mb-6 p-3 bg-warning-100 border border-warning-300 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning-700 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="text-xs text-warning-800">
              <span className="font-semibold">This is a test payment.</span> Use test card: 4242
              4242 4242 4242. Any future expiry date and CVV will work.
            </div>
          </div>
        </div>

        {/* Card Input Fields */}
        <div className="space-y-4">
          {/* Card Number */}
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium text-neutral-700 mb-2">
              Card Number
            </label>
            <Input
              id="cardNumber"
              type="text"
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              inputMode="numeric"
              autoComplete="cc-number"
              leftAddon={<CreditCard className="w-4 h-4" aria-hidden="true" />}
              error={errors.cardNumber?.message}
              {...register('cardNumber', {
                onChange: (e) => {
                  e.target.value = formatCardNumber(e.target.value);
                },
              })}
            />
          </div>

          {/* Expiry and CVV Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Expiry Date */}
            <div>
              <label htmlFor="expiry" className="block text-sm font-medium text-neutral-700 mb-2">
                Expiry Date
              </label>
              <Input
                id="expiry"
                type="text"
                placeholder="MM / YY"
                maxLength={7}
                inputMode="numeric"
                autoComplete="cc-exp"
                error={errors.expiry?.message}
                {...register('expiry', {
                  onChange: (e) => {
                    e.target.value = formatExpiry(e.target.value);
                  },
                })}
              />
            </div>

            {/* CVV */}
            <div>
              <label htmlFor="cvv" className="block text-sm font-medium text-neutral-700 mb-2">
                CVV
              </label>
              <Input
                id="cvv"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                error={errors.cvv?.message}
                {...register('cvv')}
              />
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label htmlFor="cardholderName" className="block text-sm font-medium text-neutral-700 mb-2">
              Cardholder Name
            </label>
            <Input
              id="cardholderName"
              type="text"
              placeholder="John Doe"
              autoComplete="cc-name"
              error={errors.cardholderName?.message}
              {...register('cardholderName')}
            />
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-xs text-neutral-600 flex items-center gap-1">
          <CreditCard className="w-3 h-3" aria-hidden="true" />
          <span>Your payment information is secure and encrypted</span>
        </div>
      </CardContent>
    </Card>
  );
}
