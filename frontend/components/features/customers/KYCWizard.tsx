'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Shield,
  FileCheck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Select } from '@/components/ui/select/Select';
import {
  useCreateInquiry,
  useSubmitGovernmentId,
  useSubmitSelfie,
  useInquiry,
} from '@/lib/hooks/api/use-kyc';
import {
  kycDocumentSchema,
  kycSelfieSchema,
  type KYCDocumentFormData,
  type KYCSelfieFormData,
} from '@/lib/validations/customer.validation';

interface KYCWizardProps {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 'intro' | 'document' | 'selfie' | 'processing' | 'success' | 'error';

export function KYCWizard({
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  onComplete,
  onCancel,
}: KYCWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('intro');
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createInquiry = useCreateInquiry();
  const submitGovernmentId = useSubmitGovernmentId();
  const submitSelfie = useSubmitSelfie();
  const { data: inquiry } = useInquiry(inquiryId || '');

  // Start KYC process
  const handleStartKYC = async () => {
    try {
      const newInquiry = await createInquiry.mutateAsync(customerId);
      setInquiryId(newInquiry.id);
      setCurrentStep('document');
    } catch (error: any) {
      console.error('Failed to create inquiry:', error);
      setErrorMessage('Failed to start verification. Please try again.');
      setCurrentStep('error');
    }
  };

  // Submit government ID
  const handleSubmitDocument = async (frontFile: File, backFile?: File) => {
    if (!inquiryId) return;

    try {
      setCurrentStep('processing');
      await submitGovernmentId.mutateAsync({
        inquiryId,
        file: frontFile,
      });
      setCurrentStep('selfie');
    } catch (error: any) {
      console.error('Failed to submit document:', error);
      setErrorMessage('Failed to upload document. Please try again.');
      setCurrentStep('error');
    }
  };

  // Submit selfie
  const handleSubmitSelfie = async (file: File) => {
    if (!inquiryId) return;

    try {
      setCurrentStep('processing');
      const result = await submitSelfie.mutateAsync({
        inquiryId,
        file,
      });

      // Poll for result (in real implementation, this would be more sophisticated)
      setTimeout(() => {
        if (result.status === 'APPROVED') {
          setCurrentStep('success');
        } else if (result.status === 'DECLINED') {
          setErrorMessage(
            result.declineReasons?.join(', ') || 'Verification declined'
          );
          setCurrentStep('error');
        } else {
          // Still processing
          setCurrentStep('processing');
        }
      }, 2000);
    } catch (error: any) {
      console.error('Failed to submit selfie:', error);
      setErrorMessage('Failed to upload selfie. Please try again.');
      setCurrentStep('error');
    }
  };

  // Step progress
  const steps = [
    { key: 'intro', label: 'Introduction', icon: Shield },
    { key: 'document', label: 'Government ID', icon: FileCheck },
    { key: 'selfie', label: 'Selfie', icon: Camera },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      {currentStep !== 'intro' &&
        currentStep !== 'success' &&
        currentStep !== 'error' && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      index < currentStepIndex
                        ? 'bg-success-600 border-success-600 text-white'
                        : index === currentStepIndex
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-neutral-300 text-neutral-400'
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded transition-all ${
                        index < currentStepIndex
                          ? 'bg-success-600'
                          : 'bg-neutral-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              {steps.map((step) => (
                <div
                  key={step.key}
                  className="flex-1 text-center text-xs text-neutral-600"
                >
                  {step.label}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Step content */}
      {currentStep === 'intro' && (
        <IntroStep
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          onStart={handleStartKYC}
          onCancel={onCancel}
          isLoading={createInquiry.isPending}
        />
      )}

      {currentStep === 'document' && (
        <DocumentStep
          onSubmit={handleSubmitDocument}
          onBack={() => setCurrentStep('intro')}
          onCancel={onCancel}
          isLoading={submitGovernmentId.isPending}
        />
      )}

      {currentStep === 'selfie' && (
        <SelfieStep
          onSubmit={handleSubmitSelfie}
          onBack={() => setCurrentStep('document')}
          onCancel={onCancel}
          isLoading={submitSelfie.isPending}
        />
      )}

      {currentStep === 'processing' && <ProcessingStep />}

      {currentStep === 'success' && (
        <SuccessStep
          customerName={customerName}
          onViewCustomer={onComplete}
          onCreateBooking={() => {
            /* TODO: Navigate to create booking */
          }}
        />
      )}

      {currentStep === 'error' && (
        <ErrorStep
          message={errorMessage}
          onRetry={() => setCurrentStep('intro')}
          onContactSupport={onCancel}
        />
      )}
    </div>
  );
}

// Step 1: Introduction
function IntroStep({
  customerName,
  customerEmail,
  customerPhone,
  onStart,
  onCancel,
  isLoading,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onStart: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Identity Verification Required
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            To rent vehicles, customers must verify their identity. This process
            includes government-issued ID, selfie photo, and liveness check.
          </p>
        </div>

        <div className="bg-neutral-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-neutral-900 mb-4">
            What you'll need:
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-neutral-900">
                  Government-issued ID
                </div>
                <div className="text-sm text-neutral-600">
                  Driver's License, Passport, or State ID
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-neutral-900">Selfie photo</div>
                <div className="text-sm text-neutral-600">
                  For identity matching and liveness check
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-neutral-900">
                  2-5 minutes of time
                </div>
                <div className="text-sm text-neutral-600">
                  The process is quick and straightforward
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary-50 rounded-lg p-4 mb-8 border border-primary-200">
          <h4 className="font-semibold text-neutral-900 mb-2">
            Customer Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-neutral-600">Name</div>
              <div className="font-medium text-neutral-900">{customerName}</div>
            </div>
            <div>
              <div className="text-neutral-600">Email</div>
              <div className="font-medium text-neutral-900">{customerEmail}</div>
            </div>
            <div>
              <div className="text-neutral-600">Phone</div>
              <div className="font-medium text-neutral-900">{customerPhone}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onStart}
            isLoading={isLoading}
            leftIcon={<Shield className="w-4 h-4" />}
          >
            Start Verification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 2: Document Upload
function DocumentStep({
  onSubmit,
  onBack,
  onCancel,
  isLoading,
}: {
  onSubmit: (frontFile: File, backFile?: File) => void;
  onBack: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [idType, setIdType] = useState<string>('dl');

  const handleFrontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFrontFile(e.target.files[0]);
    }
  };

  const handleBackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setBackFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (frontFile) {
      onSubmit(frontFile, backFile || undefined);
    }
  };

  return (
    <Card>
      <CardContent className="p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Government ID Verification
          </h2>
          <p className="text-neutral-600">
            Upload a clear photo of your government-issued ID
          </p>
        </div>

        <div className="space-y-6">
          {/* ID Type Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              ID Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'dl', label: "Driver's License" },
                { value: 'passport', label: 'Passport' },
                { value: 'state_id', label: 'State ID' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setIdType(type.value)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    idType === type.value
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Front Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Front of ID <span className="text-error-600">*</span>
            </label>
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
              {frontFile ? (
                <div className="space-y-3">
                  <FileCheck className="w-12 h-12 text-success-600 mx-auto" />
                  <div>
                    <div className="font-medium text-neutral-900">{frontFile.name}</div>
                    <div className="text-sm text-neutral-600">
                      {(frontFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFrontFile(null)}
                    leftIcon={<X className="w-4 h-4" />}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                  <div className="font-medium text-neutral-900 mb-1">
                    Click to upload or drag and drop
                  </div>
                  <div className="text-sm text-neutral-600">
                    JPG, PNG, or PDF (max 10MB)
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={handleFrontFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Back Photo Upload (optional) */}
          {idType !== 'passport' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Back of ID (if applicable)
              </label>
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                {backFile ? (
                  <div className="space-y-3">
                    <FileCheck className="w-12 h-12 text-success-600 mx-auto" />
                    <div>
                      <div className="font-medium text-neutral-900">{backFile.name}</div>
                      <div className="text-sm text-neutral-600">
                        {(backFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBackFile(null)}
                      leftIcon={<X className="w-4 h-4" />}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                    <div className="font-medium text-neutral-900 mb-1">
                      Click to upload or drag and drop
                    </div>
                    <div className="text-sm text-neutral-600">
                      JPG, PNG, or PDF (max 10MB)
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={handleBackFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 text-sm font-bold">💡</span>
              </div>
              <div className="text-sm text-neutral-700">
                <div className="font-semibold mb-1">Tips for best results:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure all text is clearly visible</li>
                  <li>Avoid glare or shadows</li>
                  <li>Include all four corners of the ID</li>
                  <li>Use good lighting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-neutral-200">
          <Button
            variant="ghost"
            onClick={onBack}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            disabled={isLoading}
          >
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!frontFile || isLoading}
              isLoading={isLoading}
            >
              Upload & Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 3: Selfie
function SelfieStep({
  onSubmit,
  onBack,
  onCancel,
  isLoading,
}: {
  onSubmit: (file: File) => void;
  onBack: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelfieFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (selfieFile) {
      onSubmit(selfieFile);
    }
  };

  return (
    <Card>
      <CardContent className="p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Selfie Verification
          </h2>
          <p className="text-neutral-600">
            Take a selfie to verify your identity matches the ID you provided
          </p>
        </div>

        <div className="space-y-6">
          {/* Selfie Upload */}
          <div className="border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center hover:border-primary-400 transition-colors">
            {selfieFile ? (
              <div className="space-y-4">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden">
                  <img
                    src={URL.createObjectURL(selfieFile)}
                    alt="Selfie preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium text-neutral-900">{selfieFile.name}</div>
                  <div className="text-sm text-neutral-600">
                    {(selfieFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelfieFile(null)}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Retake
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Camera className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                <div className="font-medium text-neutral-900 mb-2 text-lg">
                  Upload a selfie photo
                </div>
                <div className="text-sm text-neutral-600 mb-4">
                  JPG or PNG (max 10MB)
                </div>
                <Button type="button" variant="primary" className="pointer-events-none">
                  Choose Photo
                </Button>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Tips */}
          <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 text-sm font-bold">💡</span>
              </div>
              <div className="text-sm text-neutral-700">
                <div className="font-semibold mb-1">Tips for best results:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Face the camera directly</li>
                  <li>Remove glasses and hats</li>
                  <li>Ensure good lighting</li>
                  <li>Use a neutral expression</li>
                  <li>Keep your entire face visible</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-neutral-200">
          <Button
            variant="ghost"
            onClick={onBack}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            disabled={isLoading}
          >
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!selfieFile || isLoading}
              isLoading={isLoading}
            >
              Submit Verification
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Processing Step
function ProcessingStep() {
  return (
    <Card>
      <CardContent className="p-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Verifying Identity...
          </h2>
          <p className="text-neutral-600 mb-8">
            This usually takes 30-60 seconds. Please don't close this window.
          </p>

          <div className="max-w-md mx-auto space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-600" />
              <span className="text-neutral-700">ID authenticity</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-600" />
              <span className="text-neutral-700">Face match</span>
            </div>
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
              <span className="text-neutral-700">Liveness check</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-neutral-300" />
              <span className="text-neutral-500">Database verification</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Success Step
function SuccessStep({
  customerName,
  onViewCustomer,
  onCreateBooking,
}: {
  customerName: string;
  onViewCustomer: () => void;
  onCreateBooking: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Verification Complete!
          </h2>
          <p className="text-neutral-600 mb-8">
            {customerName} has been successfully verified.
          </p>

          <div className="bg-success-50 rounded-lg p-6 max-w-md mx-auto mb-8 border border-success-200">
            <div className="text-sm font-semibold text-neutral-900 mb-3">
              All checks passed:
            </div>
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-600" />
                <span className="text-neutral-700">Government ID verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-600" />
                <span className="text-neutral-700">Selfie match confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-600" />
                <span className="text-neutral-700">Liveness check passed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-600" />
                <span className="text-neutral-700">No flags in database</span>
              </div>
            </div>
          </div>

          <p className="text-neutral-600 mb-6">
            The customer can now create bookings and rent vehicles.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={onViewCustomer}>
              View Customer
            </Button>
            <Button variant="primary" onClick={onCreateBooking}>
              Create Booking
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Error Step
function ErrorStep({
  message,
  onRetry,
  onContactSupport,
}: {
  message: string | null;
  onRetry: () => void;
  onContactSupport: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-error-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Verification Failed
          </h2>
          <p className="text-neutral-600 mb-6">
            {message || 'Identity verification could not be completed.'}
          </p>

          <div className="bg-error-50 rounded-lg p-6 max-w-md mx-auto mb-8 border border-error-200">
            <div className="text-sm font-semibold text-neutral-900 mb-3">
              Next steps:
            </div>
            <ul className="text-left text-neutral-700 space-y-2 text-sm">
              <li>• Review the uploaded documents</li>
              <li>• Ensure ID is valid and not expired</li>
              <li>• Try again with a clearer photo</li>
              <li>• Contact support if issue persists</li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={onContactSupport}>
              Contact Support
            </Button>
            <Button variant="primary" onClick={onRetry}>
              Retry Verification
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
