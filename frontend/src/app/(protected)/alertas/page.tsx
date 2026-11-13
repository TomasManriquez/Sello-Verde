'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Las alertas se reemplazaron por la vista de Vencimientos, que se calcula desde el sello de cada instalación. */
export default function AlertasRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/vencimientos');
  }, [router]);
  return null;
}
