import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './animation.css';
import ClientLayout from '@/app/layout.client';
import ServerSEO from '@/shared/components/seo/ServerSEO';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
  auth,
}: Readonly<{
  children: React.ReactNode;
  auth: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ServerSEO />
        <ClientLayout auth={auth}>{children}</ClientLayout>
      </body>
    </html>
  );
}
