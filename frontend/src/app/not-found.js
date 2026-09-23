import Link from 'next/link';

export const metadata = { title: 'Página no encontrada · MY 50 POINTS' };

/** Branded 404 — rendered inside the root layout, so the global nav stays. */
export default function NotFound() {
  return (
    <div className="ui-container ui-container--narrow ui-page nf">
      <p className="nf__code t-data" aria-hidden>404</p>
      <h1 className="t-page">Esta pista no existe</h1>
      <p className="t-body-lg">
        La página que buscas no está en el programa. Vuelve a la salida y elige un torneo.
      </p>
      <p className="t-meta" lang="en">Page not found.</p>
      <div className="nf__actions">
        <Link href="/" className="ui-btn ui-btn--primary ui-btn--lg">Ir al inicio</Link>
        <Link href="/tournaments" className="ui-btn ui-btn--secondary ui-btn--lg">Ver torneos</Link>
      </div>
    </div>
  );
}
