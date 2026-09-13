import RankingClient from './RankingClient';

export function generateStaticParams() {
  return [
    { id: 'gulfstream-park-2026' },
    { id: 'santa-anita-spring-2026' },
    { id: 'churchill-downs-classic-2026' },
  ];
}

export default function RankingPage() {
  return <RankingClient />;
}
