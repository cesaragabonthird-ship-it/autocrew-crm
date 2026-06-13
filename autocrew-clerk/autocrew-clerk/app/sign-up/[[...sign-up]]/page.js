import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"/>
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3">
            <div className="bg-orange-500 p-2.5 rounded-2xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            </div>
            <span className="text-2xl font-bold text-white">AutoCrew</span>
          </div>
          <p className="text-white/50 text-sm mt-2">Start your free 14-day trial</p>
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
