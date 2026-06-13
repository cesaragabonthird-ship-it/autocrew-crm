import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { UserProvider } from '@/lib/UserContext';

export const metadata = {
  title: 'AutoCrew — Car Accessories Management',
  description: 'Inventory, jobs, installer portal & sales tracking.',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary:    '#f97316',
          colorBackground: '#ffffff',
          colorText:       '#111827',
          borderRadius:    '0.75rem',
          fontFamily:      'DM Sans, system-ui, sans-serif',
        },
        elements: {
          card:               'shadow-2xl border border-gray-200',
          headerTitle:        'text-2xl font-bold text-gray-900',
          headerSubtitle:     'text-gray-500',
          socialButtonsBlockButton: 'border border-gray-300 hover:border-gray-400 font-medium',
          formButtonPrimary:  'bg-orange-500 hover:bg-orange-600 text-sm font-semibold',
          footerActionLink:   'text-orange-500 hover:text-orange-600 font-medium',
          formFieldInput:     'border border-gray-300 rounded-xl text-sm',
        },
      }}
    >
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
          <meta name="apple-mobile-web-app-capable" content="yes"/>
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
          <meta name="apple-mobile-web-app-title" content="AutoCrew"/>
          <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
          <link rel="icon" href="/favicon.ico" sizes="any"/>
          <link rel="icon" href="/favicon.png" type="image/png"/>
          <link rel="preconnect" href="https://fonts.googleapis.com"/>
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        </head>
        <body>
          <ConvexClientProvider>
            <UserProvider>
              {children}
            </UserProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
