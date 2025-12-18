'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Input,
  Label,
  FormError,
  FormField,
  Select,
  Textarea,
  Checkbox,
  Radio,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
} from '@/components/ui';
import { FormGroup } from '@/components/composite';
import { Search, Download, Trash2, Heart, Star, AlertCircle } from 'lucide-react';

export default function ComponentsShowcase() {
  const [loadingButton, setLoadingButton] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');
  const [showSkeleton, setShowSkeleton] = useState(true);

  const { control, handleSubmit } = useForm({
    defaultValues: {
      email: '',
      password: '',
      username: '',
    },
  });

  const onSubmit = (data: any) => {
    console.log('Form submitted:', data);
  };

  const simulateLoading = (buttonId: string) => {
    setLoadingButton(buttonId);
    setTimeout(() => setLoadingButton(''), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">
            FleetPass Component Library
          </h1>
          <p className="text-neutral-600">
            Core UI components built with React, TypeScript, and Tailwind CSS
          </p>
        </div>

        {/* Button Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Button</h2>

          <div className="space-y-6">
            {/* Variants */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            {/* With Icons */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <Button leftIcon={<Search className="h-4 w-4" />}>Search</Button>
                <Button
                  variant="secondary"
                  rightIcon={<Download className="h-4 w-4" />}
                >
                  Download
                </Button>
                <Button
                  variant="danger"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Loading States */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Loading States</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  isLoading={loadingButton === 'primary'}
                  onClick={() => simulateLoading('primary')}
                >
                  Primary Loading
                </Button>
                <Button
                  variant="secondary"
                  isLoading={loadingButton === 'secondary'}
                  onClick={() => simulateLoading('secondary')}
                >
                  Secondary Loading
                </Button>
              </div>
            </div>

            {/* Disabled */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Disabled</h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled Primary</Button>
                <Button variant="secondary" disabled>
                  Disabled Secondary
                </Button>
              </div>
            </div>

            {/* Full Width */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Full Width</h3>
              <Button fullWidth>Full Width Button</Button>
            </div>
          </div>
        </section>

        {/* Input Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Input</h2>

          <div className="space-y-6 max-w-md">
            {/* Default */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Default</h3>
              <Input placeholder="Enter text..." />
            </div>

            {/* Variants */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Variants</h3>
              <div className="space-y-3">
                <Input placeholder="Default variant" variant="default" />
                <Input placeholder="Error variant" variant="error" />
                <Input placeholder="Success variant" variant="success" />
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Sizes</h3>
              <div className="space-y-3">
                <Input placeholder="Small" size="sm" />
                <Input placeholder="Medium" size="md" />
                <Input placeholder="Large" size="lg" />
              </div>
            </div>

            {/* With Addons */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">With Addons</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Search..."
                  leftAddon={<Search className="h-4 w-4" />}
                />
                <Input
                  placeholder="Amount"
                  leftAddon={<span className="text-sm">$</span>}
                  rightAddon={<span className="text-sm">.00</span>}
                />
              </div>
            </div>

            {/* Disabled */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Disabled</h3>
              <Input placeholder="Disabled input" disabled />
            </div>
          </div>
        </section>

        {/* Label Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Label</h2>

          <div className="space-y-6 max-w-md">
            <div>
              <Label>Default Label</Label>
              <Input placeholder="Input field" />
            </div>

            <div>
              <Label required>Required Field</Label>
              <Input placeholder="This field is required" />
            </div>

            <div>
              <Label optional>Optional Field</Label>
              <Input placeholder="This field is optional" />
            </div>
          </div>
        </section>

        {/* FormError Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">FormError</h2>

          <div className="space-y-4 max-w-md">
            <FormError>This is an error message</FormError>
            <FormError>Please enter a valid email address</FormError>
            <FormError>Password must be at least 8 characters</FormError>
          </div>
        </section>

        {/* FormField Component (React Hook Form Integration) */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
            FormField (React Hook Form Integration)
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
            <FormField
              name="username"
              control={control}
              label="Username"
              helperText="Choose a unique username"
              inputProps={{ placeholder: 'johndoe' }}
            />

            <FormField
              name="email"
              control={control}
              label="Email Address"
              required
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              inputProps={{
                type: 'email',
                placeholder: 'john@example.com',
              }}
            />

            <FormField
              name="password"
              control={control}
              label="Password"
              required
              helperText="Must be at least 8 characters"
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              }}
              inputProps={{
                type: 'password',
                placeholder: '••••••••',
              }}
            />

            <Button type="submit" fullWidth>
              Submit Form
            </Button>
          </form>
        </section>

        {/* Select Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Select</h2>

          <div className="space-y-6 max-w-md">
            {/* Default */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Default</h3>
              <Select
                options={[
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' },
                ]}
                placeholder="Select an option"
              />
            </div>

            {/* Variants */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Variants</h3>
              <div className="space-y-3">
                <Select
                  options={[
                    { value: '1', label: 'Item 1' },
                    { value: '2', label: 'Item 2' },
                  ]}
                  placeholder="Default variant"
                />
                <Select
                  options={[
                    { value: '1', label: 'Item 1' },
                    { value: '2', label: 'Item 2' },
                  ]}
                  placeholder="Error variant"
                  error
                />
                <Select
                  options={[
                    { value: '1', label: 'Item 1' },
                    { value: '2', label: 'Item 2' },
                  ]}
                  placeholder="Success variant"
                  variant="success"
                />
              </div>
            </div>

            {/* With Disabled Options */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                With Disabled Options
              </h3>
              <Select
                options={[
                  { value: 'car', label: 'Car' },
                  { value: 'truck', label: 'Truck (Unavailable)', disabled: true },
                  { value: 'van', label: 'Van' },
                ]}
                placeholder="Select vehicle type"
              />
            </div>
          </div>
        </section>

        {/* Textarea Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Textarea</h2>

          <div className="space-y-6 max-w-md">
            {/* Default */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Default</h3>
              <Textarea placeholder="Enter your message..." />
            </div>

            {/* Variants */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Variants</h3>
              <div className="space-y-3">
                <Textarea placeholder="Default variant" />
                <Textarea placeholder="Error variant" error />
                <Textarea placeholder="Success variant" variant="success" />
              </div>
            </div>

            {/* Resize Options */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Resize Options
              </h3>
              <div className="space-y-3">
                <Textarea placeholder="Resize none" resize="none" />
                <Textarea placeholder="Resize vertical (default)" />
                <Textarea placeholder="Resize horizontal" resize="horizontal" />
                <Textarea placeholder="Resize both" resize="both" />
              </div>
            </div>
          </div>
        </section>

        {/* Checkbox Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Checkbox</h2>

          <div className="space-y-6 max-w-md">
            {/* Default */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Default</h3>
              <Checkbox />
            </div>

            {/* With Label */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">With Label</h3>
              <div className="space-y-3">
                <Checkbox label="Accept terms and conditions" />
                <Checkbox label="Subscribe to newsletter" />
                <Checkbox label="Enable notifications" />
              </div>
            </div>

            {/* With Description */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                With Description
              </h3>
              <div className="space-y-4">
                <Checkbox
                  label="Marketing emails"
                  description="Receive emails about new products and features"
                />
                <Checkbox
                  label="Security updates"
                  description="Get notified about security updates"
                  defaultChecked
                />
              </div>
            </div>

            {/* States */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">States</h3>
              <div className="space-y-3">
                <Checkbox label="Default" />
                <Checkbox label="Checked" defaultChecked />
                <Checkbox label="Disabled" disabled />
                <Checkbox label="Disabled & Checked" disabled defaultChecked />
                <Checkbox label="Error state" error />
              </div>
            </div>
          </div>
        </section>

        {/* Radio Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Radio</h2>

          <div className="space-y-6 max-w-md">
            {/* Vertical (Default) */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Vertical Orientation
              </h3>
              <Radio
                name="vertical-radio"
                options={[
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' },
                ]}
              />
            </div>

            {/* Horizontal */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Horizontal Orientation
              </h3>
              <Radio
                name="horizontal-radio"
                orientation="horizontal"
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
              />
            </div>

            {/* With Descriptions */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                With Descriptions
              </h3>
              <Radio
                name="plan-radio"
                options={[
                  {
                    value: 'basic',
                    label: 'Basic',
                    description: 'Perfect for small teams',
                  },
                  {
                    value: 'pro',
                    label: 'Professional',
                    description: 'For growing businesses',
                  },
                  {
                    value: 'enterprise',
                    label: 'Enterprise',
                    description: 'For large organizations',
                  },
                ]}
              />
            </div>

            {/* With Disabled Option */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                With Disabled Option
              </h3>
              <Radio
                name="disabled-radio"
                options={[
                  { value: 'available1', label: 'Available Option 1' },
                  {
                    value: 'unavailable',
                    label: 'Unavailable Option',
                    disabled: true,
                  },
                  { value: 'available2', label: 'Available Option 2' },
                ]}
              />
            </div>

            {/* Error State */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Error State
              </h3>
              <Radio
                name="error-radio"
                error
                options={[
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                ]}
              />
              <FormError>Please select an option</FormError>
            </div>
          </div>
        </section>

        {/* FormGroup Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">FormGroup</h2>

          <div className="space-y-6 max-w-md">
            {/* With Input */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">With Input</h3>
              <FormGroup
                label="Email Address"
                helperText="We'll never share your email"
                htmlFor="email"
              >
                <Input id="email" type="email" placeholder="you@example.com" />
              </FormGroup>
            </div>

            {/* Required Field */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Required Field
              </h3>
              <FormGroup
                label="Username"
                required
                helperText="Choose a unique username"
                htmlFor="username"
              >
                <Input id="username" placeholder="johndoe" />
              </FormGroup>
            </div>

            {/* With Error */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">With Error</h3>
              <FormGroup
                label="Password"
                error="Password must be at least 8 characters"
                htmlFor="password"
              >
                <Input id="password" type="password" error />
              </FormGroup>
            </div>

            {/* With Select */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">With Select</h3>
              <FormGroup
                label="Country"
                helperText="Select your country of residence"
                htmlFor="country"
              >
                <Select
                  id="country"
                  options={[
                    { value: 'us', label: 'United States' },
                    { value: 'ca', label: 'Canada' },
                    { value: 'uk', label: 'United Kingdom' },
                  ]}
                  placeholder="Select a country"
                />
              </FormGroup>
            </div>

            {/* With Textarea */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                With Textarea
              </h3>
              <FormGroup
                label="Comments"
                helperText="Share your thoughts"
                htmlFor="comments"
              >
                <Textarea id="comments" placeholder="Enter your comments..." />
              </FormGroup>
            </div>
          </div>
        </section>

        {/* Complete Form Example */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
            Complete Form Example
          </h2>

          <div className="max-w-md space-y-4">
            <div>
              <Label htmlFor="first-name" required>
                First Name
              </Label>
              <Input id="first-name" placeholder="John" />
            </div>

            <div>
              <Label htmlFor="last-name" required>
                Last Name
              </Label>
              <Input id="last-name" placeholder="Doe" />
            </div>

            <div>
              <Label htmlFor="phone" optional>
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                leftAddon={<span className="text-sm">📞</span>}
              />
            </div>

            <div>
              <Label htmlFor="website" optional>
                Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                error
              />
              <FormError>Please enter a valid URL</FormError>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" fullWidth>
                Save Changes
              </Button>
              <Button type="button" variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </div>
        </section>

        {/* Card Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Card</h2>

          <div className="space-y-6">
            {/* Basic Card */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Basic Card</h3>
              <Card>
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card description text goes here</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600">
                    This is the main content area of the card. You can put any content here.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button size="sm">Action</Button>
                  <Button size="sm" variant="ghost">
                    Cancel
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Card Variants */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Card Variants</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="sm">
                  <CardHeader>
                    <CardTitle>Small Padding</CardTitle>
                  </CardHeader>
                  <CardContent>Compact card with less space</CardContent>
                </Card>

                <Card padding="md" hover>
                  <CardHeader>
                    <CardTitle>Hover Effect</CardTitle>
                  </CardHeader>
                  <CardContent>Hover over this card</CardContent>
                </Card>

                <Card padding="lg" clickable onClick={() => alert('Card clicked!')}>
                  <CardHeader>
                    <CardTitle>Clickable</CardTitle>
                  </CardHeader>
                  <CardContent>Click this card</CardContent>
                </Card>
              </div>
            </div>

            {/* Product Card Example */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Product Card Example</h3>
              <div className="max-w-sm">
                <Card hover clickable>
                  <div className="aspect-video bg-neutral-100 rounded-t-2xl flex items-center justify-center">
                    <span className="text-neutral-400">Product Image</span>
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Premium Product</CardTitle>
                        <CardDescription>High-quality item</CardDescription>
                      </div>
                      <Badge variant="success">In Stock</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-neutral-900">$299.99</p>
                  </CardContent>
                  <CardFooter>
                    <Button fullWidth leftIcon={<Heart className="h-4 w-4" />}>
                      Add to Wishlist
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Badge Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Badge</h2>

          <div className="space-y-6">
            {/* Variants */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="neutral">Neutral</Badge>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
              </div>
            </div>

            {/* With Icons */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="success">
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
                <Badge variant="warning">
                  <AlertCircle className="h-3 w-3" />
                  Warning
                </Badge>
                <Badge variant="error">
                  3
                </Badge>
              </div>
            </div>

            {/* Usage Examples */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Usage Examples</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-700">Order Status:</span>
                  <Badge variant="success">Delivered</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-700">User Role:</span>
                  <Badge variant="primary">Admin</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-700">Priority:</span>
                  <Badge variant="error">Urgent</Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modal Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Modal</h2>

          <div className="space-y-6">
            {/* Basic Modal */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Basic Modal</h3>
              <Button onClick={() => { setModalSize('md'); setIsModalOpen(true); }}>
                Open Modal
              </Button>
            </div>

            {/* Modal Sizes */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Modal Sizes</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setModalSize('sm'); setIsModalOpen(true); }}
                >
                  Small
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setModalSize('md'); setIsModalOpen(true); }}
                >
                  Medium
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setModalSize('lg'); setIsModalOpen(true); }}
                >
                  Large
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setModalSize('xl'); setIsModalOpen(true); }}
                >
                  Extra Large
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setModalSize('full'); setIsModalOpen(true); }}
                >
                  Full Width
                </Button>
              </div>
            </div>
          </div>

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size={modalSize}>
            <ModalHeader>
              <div>
                <ModalTitle>Modal Title</ModalTitle>
                <ModalDescription>This is a description of the modal content</ModalDescription>
              </div>
              <ModalCloseButton onClose={() => setIsModalOpen(false)} />
            </ModalHeader>
            <ModalBody>
              <p className="text-neutral-600">
                This is the main content of the modal. You can put any content here,
                including forms, tables, or other components. The modal includes:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-neutral-600">
                <li>Focus trap for accessibility</li>
                <li>Escape key to close</li>
                <li>Backdrop click to close</li>
                <li>Body scroll lock when open</li>
                <li>Multiple size options</li>
              </ul>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>
                Confirm
              </Button>
            </ModalFooter>
          </Modal>
        </section>

        {/* Skeleton Component */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Skeleton</h2>

          <div className="space-y-6">
            {/* Toggle Control */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => setShowSkeleton(!showSkeleton)}
              >
                {showSkeleton ? 'Show Content' : 'Show Skeleton'}
              </Button>
              <span className="text-sm text-neutral-600">
                Toggle to see loading states
              </span>
            </div>

            {/* Skeleton Variants */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Skeleton Variants</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 w-20">Text:</span>
                  <Skeleton variant="text" width="300px" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 w-20">Title:</span>
                  <Skeleton variant="title" width="200px" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 w-20">Button:</span>
                  <Skeleton variant="button" width="120px" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 w-20">Avatar:</span>
                  <Skeleton variant="avatar" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 w-20">Card:</span>
                  <Skeleton variant="card" width="100%" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 w-20">Image:</span>
                  <Skeleton variant="image" width="100%" />
                </div>
              </div>
            </div>

            {/* Skeleton Presets */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Skeleton Card Preset
              </h3>
              {showSkeleton ? (
                <SkeletonCard />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Loaded Content</CardTitle>
                    <CardDescription>This content has finished loading</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-600">
                      The actual content appears after the loading state.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm">Action</Button>
                    <Button size="sm" variant="ghost">Cancel</Button>
                  </CardFooter>
                </Card>
              )}
            </div>

            {/* Skeleton Table Preset */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Skeleton Table Preset
              </h3>
              {showSkeleton ? (
                <SkeletonTable rows={3} />
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <p className="font-medium">Table Header</p>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-white border rounded-lg">
                      <p>Table Row {i}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skeleton Form Preset */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Skeleton Form Preset
              </h3>
              {showSkeleton ? (
                <SkeletonForm />
              ) : (
                <div className="space-y-6">
                  <FormGroup label="Name" htmlFor="name">
                    <Input id="name" placeholder="Enter your name" />
                  </FormGroup>
                  <FormGroup label="Email" htmlFor="email">
                    <Input id="email" type="email" placeholder="Enter your email" />
                  </FormGroup>
                  <FormGroup label="Message" htmlFor="message">
                    <Textarea id="message" placeholder="Enter your message" />
                  </FormGroup>
                  <div className="flex gap-3">
                    <Button>Submit</Button>
                    <Button variant="ghost">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
