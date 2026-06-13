import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"/>
      </div>
      <div className="relative w-full max-w-[400px] mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center">
            <img src="/og-image-white.png" alt="AutoCrew" className="h-[84px] object-contain" />
          </div>
          <p className="text-white/50 text-sm mt-3">Start your free 14-day trial</p>
        </div>
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          afterSignUpUrl="/onboarding"
        />
      </div>
    </div>
  );
}
