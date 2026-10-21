'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** El listado de expedientes se integró al listado de establecimientos y al tablero. */
export default function ExpedientesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/establecimientos');
  }, [router]);
  return null;
}
