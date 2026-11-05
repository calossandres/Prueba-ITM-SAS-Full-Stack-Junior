import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Mesa | Soporte interno', description: 'Gestión y seguimiento de solicitudes de soporte tecnológico' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
