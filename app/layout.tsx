import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Remix moviey - Moviesio Pro Streamer',
  description: 'منصة المشاهدة الاحترافية مع مشغل سينمائي 16:9 وسيرفرات مباشرة وسريعة من ak.sv.',
  openGraph: {
    title: 'Remix moviey - Moviesio Pro Streamer',
    description: 'منصة المشاهدة الاحترافية مع مشغل سينمائي 16:9 وسيرفرات مباشرة وسريعة من ak.sv.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Remix moviey - Moviesio Pro Streamer',
    description: 'منصة المشاهدة الاحترافية مع مشغل سينمائي 16:9 وسيرفرات مباشرة وسريعة من ak.sv.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-900 text-white min-h-screen font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
