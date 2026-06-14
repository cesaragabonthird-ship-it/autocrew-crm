'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstallerHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portal?tab=jobs');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl max-w-sm text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-orange-500 rounded-full mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Redirecting to jobs portal...</p>
      </div>
    </div>
  );
}
