'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLogout, useMe } from '@/lib/hooks/api';

export default function DealerDashboard() {
  const router = useRouter();

  const meQuery = useMe();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (meQuery.isLoading) return;
    if (meQuery.isError || !meQuery.data) {
      router.push('/auth/login');
    }
  }, [meQuery.isError, meQuery.isLoading, meQuery.data, router]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      router.push('/auth/login');
    }
  };

  const handleVehicleManagement = () => {
    router.push('/vehicles');
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (meQuery.isError || !meQuery.data) {
    return null;
  }

  const { user, organization } = meQuery.data;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">FleetPass</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to {organization.name}!
            </h2>
            <p className="text-gray-600 mb-6">
              Your dealer dashboard is under construction. Here's what's coming:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={handleVehicleManagement}
                className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg hover:bg-gray-50 transition-all duration-200"
              >
                <h3 className="font-semibold text-lg mb-2">Vehicle Management</h3>
                <p className="text-gray-600 text-sm">Add, edit, and manage your vehicle inventory</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-lg mb-2">Bookings</h3>
                <p className="text-gray-600 text-sm">View and manage customer rental bookings</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-lg mb-2">Leads & Deals</h3>
                <p className="text-gray-600 text-sm">Track leads and close deals</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-primary-50 rounded-lg">
              <p className="text-sm text-primary-900">
                ✅ <strong>Authentication working!</strong> You've successfully logged in with JWT authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
