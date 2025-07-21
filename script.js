let trails = [];
let map; // global Leaflet map
let currentMarkers = []; // track all current map markers

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
  const locationInput = document.getElementById("location").value.trim();
  const radius = parseFloat(document.getElementById("radius").value);
  const resultsDiv = document.getElementById("results");
  const placeholder = document.getElementById("search-placeholder");

  if (!locationInput) {
    alert("Please enter a ZIP code or address.");
    return;
  }

  resultsDiv.innerHTML = `<p style="text-align:center; padding: 1rem;">Loading trails...</p>`;

  let userLat, userLng;

  if (/^\d{5}$/.test(locationInput)) {
    // ZIP code
    const res = await fetch(`https://api.zippopotam.us/us/${locationInput}`);
    if (!res.ok) {
      alert("Invalid ZIP code.");
      return;
    }
    const data = await res.json();
    userLat = parseFloat(data.places[0].latitude);
    userLng = parseFloat(data.places[0].longitude);
  } else {
    // Address or city/state
    const encoded = encodeURIComponent(locationInput);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json`);
    const data = await res.json();

    if (!data.length && locationInput.includes(',')) {
      const cityOnly = locationInput.split(',').slice(1).join(',').trim();
      if (cityOnly) {
        const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityOnly)}&format=json`);
        const fallbackData = await fallbackRes.json();
        if (!fallbackData.length) {
          alert("Location not found.");
          return;
        }
        userLat = parseFloat(fallbackData[0].lat);
        userLng = parseFloat(fallbackData[0].lon);
      } else {
        alert("Location not found.");
        return;
      }
    } else if (!data.length) {
      alert("Location not found.");
      return;
    } else {
      userLat = parseFloat(data[0].lat);
      userLng = parseFloat(data[0].lon);
    }
  }

  if (!trails.length) {
    alert("Trail data is still loading. Please try again in a moment.");
    return;
  }

  // Reuse map instead of recreating
  if (!map) {
    map = L.map("map").setView([userLat, userLng], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  } else {
    map.setView([userLat, userLng], 10);
  }

  // Clear previous markers
  currentMarkers.forEach(m => map.removeLayer(m));
  currentMarkers = [];

  const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -30],
    tooltipAnchor: [12, -20],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 41]
  });

  const userMarker = L.marker([userLat, userLng], { icon: redIcon })
    .addTo(map)
    .bindPopup("You are here")
    .bindTooltip("You are here", { permanent: false, direction: "top", offset: [0, -25] });
  currentMarkers.push(userMarker);

  resultsDiv.innerHTML = "";
  if (placeholder) placeholder.style.display = "none";

  document.querySelector(".results-map-container").style.display = "flex";
  setTimeout(() => map.invalidateSize(), 0);

  let count = 0;
  const markers = {};

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

      const marker = L.marker([trailLat, trailLng]).addTo(map);
      currentMarkers.push(marker);

      if (!isTouchDevice()) {
        marker.bindTooltip(trail.name, { permanent: false, direction: "top", offset: [-15, -15] });
      }

      marker.bindPopup(
        `<a href="${trail.location_link}" target="_blank" rel="noopener noreferrer">${trail.name}</a>`
      );

      markers[trail.name] = marker;

      item.addEventListener("click", () => {
        map.once('moveend', () => {
          marker.openPopup();

          if (marker._icon) {
            if (!marker._icon.querySelector('.bounce-inner')) {
              const wrapper = document.createElement('div');
              wrapper.className = 'bounce-inner';
              wrapper.innerHTML = marker._icon.innerHTML;
              marker._icon.innerHTML = '';
              marker._icon.appendChild(wrapper);
            }

            const bounceEl = marker._icon.querySelector('.bounce-inner');
            bounceEl.classList.add('bounce-marker');
            setTimeout(() => {
              bounceEl.classList.remove('bounce-marker');
            }, 700);
          }
        });

        map.panTo(marker.getLatLng());
      });
    }
  });

  if (count === 0) {
    resultsDiv.innerHTML = `
    <div class="no-results">
      <p>No trails found in this radius.</p>
      <div class="exclamation">!</div>
    </div>`;
  }
}

function isTouchDevice() {
  return window.matchMedia("(hover: none)").matches;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const rlat1 = lat1 * (Math.PI / 180);
  const rlat2 = lat2 * (Math.PI / 180);
  const difflat = rlat2 - rlat1;
  const difflon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(difflat / 2) ** 2 +
            Math.cos(rlat1) * Math.cos(rlat2) *
            Math.sin(difflon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
