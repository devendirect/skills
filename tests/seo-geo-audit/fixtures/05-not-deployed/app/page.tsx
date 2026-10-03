import Link from "next/link";
import { guides } from "@/lib/guides";

export default function Home() {
  return (
    <main>
      <h1>Hut-to-hut hiking in the Alps, in English</h1>
      <p>
        Trailhead publishes stage-by-stage guides for multi-day hikes between mountain huts in Austria and
        Bavaria: distances, height gain, hut booking tips and the best months to go.
      </p>
      <ul>
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`}>{g.title}</Link> — {g.region}, {g.days} days, {g.difficulty}
          </li>
        ))}
      </ul>
    </main>
  );
}
