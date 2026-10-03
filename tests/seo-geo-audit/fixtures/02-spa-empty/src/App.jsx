import { Link } from "react-router-dom";
import { spots } from "./spots.js";

export default function App() {
  return (
    <main>
      <h1>Tide tables and surf windows for the Atlantic coast</h1>
      <p>
        Tidepool combines official tide predictions with swell forecasts to show, for each spot,
        the hours when the tide and the swell line up. Pick a spot to see the next seven days.
      </p>
      <ul>
        {spots.map((s) => (
          <li key={s.slug}>
            <Link to={`/spots/${s.slug}`}>{s.name}</Link> ({s.country}) — best on a {s.bestTide} tide,
            {" "}{s.swell} swell, {s.level}.
          </li>
        ))}
      </ul>
    </main>
  );
}
