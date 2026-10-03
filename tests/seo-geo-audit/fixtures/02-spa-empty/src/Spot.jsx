import { useParams } from "react-router-dom";
import { spots } from "./spots.js";

export default function Spot() {
  const { slug } = useParams();
  const spot = spots.find((s) => s.slug === slug);
  if (!spot) return <p>Unknown spot.</p>;
  return (
    <main>
      <h1>{spot.name} tide times and surf windows</h1>
      <p>
        {spot.name} ({spot.country}) works best on a {spot.bestTide} tide with a {spot.swell} swell.
        Level: {spot.level}.
      </p>
    </main>
  );
}
