import { redirect } from 'next/navigation';

export default function RacePage({ params }) {
  redirect(`/tournament/${params.id}`);
}
