import { SignIn } from '@clerk/nextjs';
import { Car } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl"/>
      </div>
      <div className="relative w-full max-w-[400px] mx-auto">
        {/* Logo above the Clerk card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center">
            <img src="/og-image-white.png" alt="AutoCrew" className="h-[84px] object-contain" />
          </div>
          <p className="text-white/50 text-sm mt-3">Car Accessories Management System</p>
        </div>
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          afterSignInUrl="/dashboard"
          afterSignUpUrl="/onboarding"
        />
        {/* Installer / Staff portal links */}
        <div className="text-center mt-4 space-y-1">
          <p className="text-white/30 text-xs">
            Installer?{' '}
            <a href="/portal" className="text-white/50 hover:text-white underline">Open Installer Portal</a>
          </p>
          <p className="text-white/30 text-xs">
            Staff member?{' '}
            <a href="/dashboard" className="text-white/50 hover:text-white underline">Open Staff Portal</a>
          </p>
        </div>
      </div>
    </div>
  );
}
