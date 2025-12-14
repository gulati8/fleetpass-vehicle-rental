import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-white to-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          FleetPass
        </h1>
        <p className="text-2xl text-gray-600 mb-8">
          Vehicle Rental Platform for Car Dealerships
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="px-6 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
