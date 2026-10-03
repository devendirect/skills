"use client";

import { useParams } from "next/navigation";
import { getGuide } from "@/lib/guides";

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = getGuide(slug);
  if (!guide) return <p>Guide not found.</p>;

  return (
    <main>
      <h1>{guide.title}</h1>
      <p>{guide.summary}</p>
      <p>
        {guide.region} · {guide.days} days · {guide.difficulty} · best from {guide.bestMonths}
      </p>
      <h2>Huts on the way</h2>
      <ol>
        {guide.huts.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ol>
    </main>
  );
}
