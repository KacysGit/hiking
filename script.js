let trails = [];

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("trails.json");
    trails = await response.json();
    console.log(`Loaded ${trails.length} trails.`);
  } catch (err) {
    console.error("Failed to load trail data:", err);
  }
});

let map; // global so we can destroy/reuse it

async function searchTrails() {
  const zip = document.getElementById("zipcode").value;
  const radius = parseFloat(document.getElementById("radius").value);
  const resultsDiv = document.getElementById("results");

  if (!zip) {
    alert("Please enter a ZIP code.");
    return;
  }

  if (!trails.length) {
    alert("Trail data is still loading. Please try again in a moment.");
    return;
  }

  const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (!res.ok) {
    alert("Invalid ZIP code");
    return;
  }

  const data = await res.json();
  const userLat = parseFloat(data.places[0].latitude);
  const userLng = parseFloat(data.places[0].longitude);

  if (map) {
    map.remove(); // completely remove old map
    document.getElementById("map").innerHTML = ""; // clear the div
  }
  map = L.map("map").setView([userLat, userLng], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  L.marker([userLat, userLng]).addTo(map).bindPopup("You are here").openPopup();


  resultsDiv.innerHTML = "";
  let count = 0;

  trails.forEach((trail) => {
    const match = trail.location_link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!match) return;

    const trailLat = parseFloat(match[1]);
    const trailLng = parseFloat(match[2]);

    const dist = getDistance(userLat, userLng, trailLat, trailLng);
    if (dist <= radius) {
      count++;
      const item = document.createElement("div");
      item.className = "result-item";
      item.innerHTML = `
        <strong>${trail.name}</strong><br>
        ${trail.full_address}<br>
        <a href="${trail.location_link}" target="_blank">Directions</a>`;
      resultsDiv.appendChild(item);

      L.marker([trailLat, trailLng]).addTo(map).bindPopup(
      `<a href="${trail.location_link}" target="_blank" rel="noopener noreferrer">${trail.name}</a>`
);

    }
  });

  if (count === 0) {
    resultsDiv.innerHTML = "<p>No trails found in this radius.</p>";
  }
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const rlat1 = lat1 * (Math.PI / 180);
  const rlat2 = lat2 * (Math.PI / 180);
  const difflat = rlat2 - rlat1;
  const difflon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(difflat / 2) ** 2 +
            Math.cos(rlat1) * Math.cos(rlat2) *
            Math.sin(difflon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
