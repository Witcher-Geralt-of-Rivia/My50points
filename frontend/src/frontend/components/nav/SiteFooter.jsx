'use client';

import Link from 'next/link';
import BrandMark from '@/frontend/components/nav/BrandMark';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { SINGLE_GUEST_ENTRY } from '@/frontend/lib/productFlags';

export default function SiteFooter() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  return (
    <footer className="site-footer">
      <div className="ui-container ui-container--wide site-footer__inner">
        <div className="site-footer__brand">
          <BrandMark size={30} />
          <div>
            <p className="site-footer__name">MY 50 <b>POINTS</b></p>
            <p className="t-meta">{isEn ? 'Your strategy. Your points. Your game.' : 'Tu estrategia. Tus puntos. Tu juego.'}</p>
          </div>
        </div>
        <nav className="site-footer__links" aria-label={isEn ? 'Footer' : 'Pie de página'}>
          <Link href="/tournaments">{isEn ? 'Tournaments' : 'Torneos'}</Link>
          {SINGLE_GUEST_ENTRY ? null : <Link href="/modalidades">{isEn ? 'Game modes' : 'Modalidades'}</Link>}
          <Link href="/how-to-play">{isEn ? 'How to play' : 'Cómo jugar'}</Link>
          <Link href="/guia-torneo">{isEn ? 'Tournament guide' : 'Guía del torneo'}</Link>
          <Link href="/leaderboard">Ranking</Link>
        </nav>
        <p className="site-footer__legal">
          <span className="site-footer__age" aria-hidden>18+</span>
          {isEn
            ? 'Adults only. Play responsibly. Points-based competition; results come from official race data.'
            : 'Solo mayores de 18 años. Juega con responsabilidad. Competición por puntos con resultados oficiales de las carreras.'}
        </p>
      </div>
    </footer>
  );
}
