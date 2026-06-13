'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/clients');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
        <p className="text-sm font-semibold text-gray-500">Redirecting to Clients list...</p>
      </div>
    </div>
  );
}
