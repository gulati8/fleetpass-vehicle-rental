import Link from 'next/link';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-neutral-600 flex items-center gap-2">
            <span className="text-6xl font-bold">404</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h2 className="text-2xl font-bold text-neutral-900">Page Not Found</h2>
          <p className="text-neutral-700">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="primary">Go Home</Button>
            </Link>
            <Link href="/dealer/vehicles">
              <Button variant="outline">View Vehicles</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
