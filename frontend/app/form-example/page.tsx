'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Select,
  Textarea,
  Checkbox,
  Radio,
} from '@/components/ui';
import { FormGroup } from '@/components/composite';

// Define the form schema with Zod
const formSchema = z.object({
  // Text inputs
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),

  // Select
  country: z.string().min(1, 'Please select a country'),

  // Textarea
  bio: z.string().min(10, 'Bio must be at least 10 characters').optional(),

  // Checkbox
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  newsletter: z.boolean().optional(),

  // Radio
  plan: z.enum(['basic', 'pro', 'enterprise'], {
    errorMap: () => ({ message: 'Please select a plan' }),
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function FormExample() {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      country: '',
      bio: '',
      terms: false,
      newsletter: false,
      plan: undefined,
    },
  });

  const onSubmit = async (data: FormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Form submitted:', data);
    alert('Form submitted successfully! Check console for data.');
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Complete Form Example
            </h1>
            <p className="text-neutral-600">
              Demonstrates React Hook Form + Zod validation with all form
              components
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-neutral-900">
                Personal Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup
                  label="First Name"
                  required
                  error={errors.firstName?.message}
                  htmlFor="firstName"
                >
                  <Input
                    id="firstName"
                    placeholder="John"
                    error={!!errors.firstName}
                    {...register('firstName')}
                  />
                </FormGroup>

                <FormGroup
                  label="Last Name"
                  required
                  error={errors.lastName?.message}
                  htmlFor="lastName"
                >
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    error={!!errors.lastName}
                    {...register('lastName')}
                  />
                </FormGroup>
              </div>

              <FormGroup
                label="Email Address"
                required
                helperText="We'll never share your email with anyone"
                error={errors.email?.message}
                htmlFor="email"
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  error={!!errors.email}
                  {...register('email')}
                />
              </FormGroup>

              <FormGroup
                label="Password"
                required
                helperText="Must be at least 8 characters"
                error={errors.password?.message}
                htmlFor="password"
              >
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  error={!!errors.password}
                  {...register('password')}
                />
              </FormGroup>

              <FormGroup
                label="Country"
                required
                error={errors.country?.message}
                htmlFor="country"
              >
                <Select
                  id="country"
                  options={[
                    { value: 'us', label: 'United States' },
                    { value: 'ca', label: 'Canada' },
                    { value: 'uk', label: 'United Kingdom' },
                    { value: 'au', label: 'Australia' },
                    { value: 'de', label: 'Germany' },
                  ]}
                  placeholder="Select a country"
                  error={!!errors.country}
                  {...register('country')}
                />
              </FormGroup>
            </div>

            {/* About Section */}
            <div className="space-y-4 pt-4 border-t border-neutral-200">
              <h2 className="text-xl font-semibold text-neutral-900">About</h2>

              <FormGroup
                label="Bio"
                helperText="Tell us a bit about yourself"
                error={errors.bio?.message}
                htmlFor="bio"
              >
                <Textarea
                  id="bio"
                  placeholder="I'm a software developer who loves..."
                  rows={4}
                  error={!!errors.bio}
                  {...register('bio')}
                />
              </FormGroup>
            </div>

            {/* Plan Selection */}
            <div className="space-y-4 pt-4 border-t border-neutral-200">
              <h2 className="text-xl font-semibold text-neutral-900">
                Choose Your Plan
              </h2>

              <FormGroup
                label="Subscription Plan"
                required
                error={errors.plan?.message}
              >
                <Controller
                  name="plan"
                  control={control}
                  render={({ field }) => (
                    <Radio
                      {...field}
                      name="plan"
                      error={!!errors.plan}
                      options={[
                        {
                          value: 'basic',
                          label: 'Basic',
                          description: '$9/month - Perfect for individuals',
                        },
                        {
                          value: 'pro',
                          label: 'Professional',
                          description: '$29/month - For small teams',
                        },
                        {
                          value: 'enterprise',
                          label: 'Enterprise',
                          description:
                            '$99/month - For large organizations',
                        },
                      ]}
                    />
                  )}
                />
              </FormGroup>
            </div>

            {/* Preferences */}
            <div className="space-y-4 pt-4 border-t border-neutral-200">
              <h2 className="text-xl font-semibold text-neutral-900">
                Preferences
              </h2>

              <div className="space-y-3">
                <Controller
                  name="terms"
                  control={control}
                  render={({ field: { value, ...field } }) => (
                    <Checkbox
                      {...field}
                      checked={value}
                      error={!!errors.terms}
                      label="I accept the terms and conditions"
                      description="You must accept the terms to continue"
                    />
                  )}
                />
                {errors.terms && (
                  <p className="text-sm text-error-600" role="alert">
                    {errors.terms.message}
                  </p>
                )}

                <Controller
                  name="newsletter"
                  control={control}
                  render={({ field: { value, ...field } }) => (
                    <Checkbox
                      {...field}
                      checked={value}
                      label="Subscribe to newsletter"
                      description="Receive updates about new features and products"
                    />
                  )}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-neutral-200">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                fullWidth
              >
                {isSubmitting ? 'Submitting...' : 'Create Account'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset()}
                disabled={isSubmitting}
              >
                Reset
              </Button>
            </div>
          </form>

          {/* Form State Debug (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-neutral-100 rounded-lg">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">
                Form Errors (Dev Mode)
              </h3>
              <pre className="text-xs text-neutral-600 overflow-auto">
                {JSON.stringify(errors, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
