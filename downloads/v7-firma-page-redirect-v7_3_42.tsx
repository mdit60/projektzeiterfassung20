// src/app/v7/firma/page.tsx
// Redirect auf Dashboard
import { redirect } from 'next/navigation';

export default function FirmaPage() {
  redirect('/v7/firma/dashboard');
}
