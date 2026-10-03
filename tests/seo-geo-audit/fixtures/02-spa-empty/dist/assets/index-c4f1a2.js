// Stand-in for the built bundle: the content only exists once JavaScript runs.
const spots=[["hossegor","Hossegor","France"],["mundaka","Mundaka","Spain"],["ericeira","Ericeira","Portugal"],["la-torche","La Torche","France"]];
document.getElementById("root").innerHTML="<main><h1>Tide tables and surf windows for the Atlantic coast</h1><p>Tidepool combines official tide predictions with swell forecasts to show, for each spot, the hours when the tide and the swell line up.</p><ul>"+spots.map(s=>`<li><a href="/spots/${s[0]}">${s[1]}</a> (${s[2]})</li>`).join("")+"</ul></main>";
