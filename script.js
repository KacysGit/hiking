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

  const map = L.map("map").setView([userLat, userLng], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  L.marker([userLat, userLng]).addTo(map).bindPopup("You are here").openPopup();

  resultsDiv.innerHTML = "";

  trails.forEach((trail) => {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trail.address)}`)
      .then(resp => resp.json())
      .then(geo => {
        if (geo && geo[0]) {
          const trailLat = parseFloat(geo[0].lat);
          const trailLng = parseFloat(geo[0].lon);

          const dist = getDistance(userLat, userLng, trailLat, trailLng);
          if (dist <= radius) {
            const item = document.createElement("div");
            item.className = "result-item";
            item.innerHTML = `<strong>${trail.name}</strong><br>${trail.address}<br><a href="${trail.mapLink}" target="_blank">Directions</a>`;
            resultsDiv.appendChild(item);

            L.marker([trailLat, trailLng]).addTo(map).bindPopup(`${trail.name}`);
          }
        }
      });
  });
}

// Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const rlat1 = lat1 * (Math.PI / 180);
  const rlat2 = lat2 * (Math.PI / 180);
  const difflat = rlat2 - rlat1;
  const difflon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(difflat / 2) ** 2 + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
