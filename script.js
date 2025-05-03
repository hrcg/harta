// --- Configuration ---
const albaniaCenter = [41.1533, 20.1683]; // Approx center of Albania
const initialZoom = 7;
const geoJsonPath = "albania_regions.geojson"; // <-- Make sure this file exists!

// Updated party colors based on the provided list
const partyColors = {
  PS: "#E41A1C", // Socialist Party (Red)
  ASHM: "#377EB8", // Democratic Party coalition (Blue)
  LB: "#FDBF6F", // Together Movement (Assigning Light Orange)
  KEA: "#CAB2D6", // Euroatlantic Coalition (Assigning Light Purple)
  NSHB: "#FF7F00", // Albania Becomes Initiative (Assigning Orange)
  DZH: "#B15928", // Right for Development (Assigning Brown)
  PM: "#FFFF99", // Opportunity Party (Assigning Light Yellow)
  PSD: "#6A3D9A", // Social Democratic Party (Assigning Purple)
  Other: "#cccccc", // Gray for others/unspecified winners
  TBD: "#f0f0f0", // Light gray for regions not yet decided
};

// Lighter shades for background fills
const partyColorsLight = {
  PS: "#FADBD8", // Light Red
  ASHM: "#D6EAF8", // Light Blue
  LB: "#FEF9E7", // Light Orange/Yellow
  KEA: "#E8DAEF", // Light Purple
  NSHB: "#FDEBD0", // Light Orange
  DZH: "#F6DDCC", // Light Brown
  PM: "#FCFAD4", // Light Yellow
  PSD: "#E1D6F0", // Light Purple
  Other: "#EAECEE", // Light Gray
};

const partyNames = {
  // For display in popups if needed later
  PS: "Partia Socialiste",
  ASHM: "Aleanca për Shqipërinë Madhështore",
  LB: "Lëvizja Bashkë",
  KEA: 'Koalicioni "Euro-Atlantike"',
  NSHB: 'Koalicioni "Nisma Shqipëria Bëhet"',
  DZH: 'Koalicioni "Djathas për Zhvillim"',
  PM: "Partia Mundësia",
  PSD: "Partia Social Demokrate e Shqipërisë",
};

// --- Election Data Structure (Will be loaded from API) ---
let currentElectionResults = {}; // Initialize empty
const apiUrl = "/api/results"; // Changed to Flask route
const updateInterval = 30000; // Check for updates every 30 seconds (adjust as needed)

const totalNationalSeats = 140;
const majorityThreshold = 71; // Seats needed for majority

// --- Map Initialization ---
const map = L.map("map", {
  // Disable map interactions if you ONLY want a static view
  //dragging: false,
  touchZoom: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  boxZoom: false,
  keyboard: false,
  zoomControl: false, // Also removes zoom buttons
  // --- Allow fractional zoom ---
  zoomSnap: 0.1, // Allow zoom levels like 7.1, 7.2 etc. Set to 0 to disable snapping completely.
  zoomDelta: 0.5, // Controls how much zoom changes per scroll wheel tick or +/- button press (if enabled)
}).setView(albaniaCenter, initialZoom);

// --- Event Listener for Centering Popup on Mobile ---
map.on("popupopen", function (e) {
  if (L.Browser.touch) {
    // Check if it's likely a touch device
    console.log("Popup opened on touch device, centering map view.");
    // Get the popup coordinates
    const px = map.project(e.popup.getLatLng());
    // Add a slight vertical offset (e.g., 50 pixels) to show slightly above center
    px.y -= 50;
    // Pan the map to the adjusted coordinates
    // map.panTo(map.unproject(px), { animate: true });
    // Alternative: Simply center on the popup's lat/lng
    // map.setView(e.popup.getLatLng(), map.getZoom(), { animate: true, pan: { duration: 0.3 } });
  }
});

// Add a base tile layer (e.g., OpenStreetMap)
// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   attribution:
//     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
// }).addTo(map); // <-- COMMENTED OUT TO HIDE BASE MAP

// --- GeoJSON Layer ---
let geoJsonLayer;

// Function to determine region style
function styleRegion(feature) {
  // *** Adjust property name based on your GeoJSON ***
  // Common names: NAME_1, name, region, qarku (Check your file!)
  const regionName = feature.properties.shapeName; // <-- UPDATED KEY
  const result = currentElectionResults[regionName];
  // Determine winner based on who got the most seats in the region, or fallback to overall winner if needed
  // This requires filling 'seatsWon' post-election. For now, use the placeholder 'winner'.
  const winner = result ? result.winner : null; // Will be null initially
  const color = partyColors[winner] || partyColors["TBD"]; // Default to TBD color

  return {
    fillColor: color,
    weight: 1.5, // Border weight
    opacity: 1,
    color: "white", // Border color
    fillOpacity: 0.75,
  };
}

// Function to handle interactions (hover, click)
function onEachRegion(feature, layer) {
  // *** Adjust property name based on your GeoJSON ***
  const regionName = feature.properties.shapeName; // <-- UPDATED KEY
  const result = currentElectionResults[regionName];

  // Popup content (Translated)
  let popupContent = `<b>${regionName}</b>`;
  if (result) {
    popupContent += `<br>Mandate Totale: ${result.totalSeats}`; // Translated "Total Seats:"
    if (result.winner) {
      popupContent += `<br>Fituesi i Parashikuar: ${result.winner}`; // Translated "Projected Winner:"

      // Add seat breakdown if seatsWon data exists and is not empty
      if (result.seatsWon && Object.keys(result.seatsWon).length > 0) {
        popupContent += `<br>--- Mandate të Fituara ---`; // Translated "--- Seats Won ---"
        // Sort parties for consistent popup order (optional)
        const sortedParties = Object.keys(result.seatsWon).sort(
          (a, b) => result.seatsWon[b] - result.seatsWon[a]
        );
        sortedParties.forEach((party) => {
          if (result.seatsWon[party] > 0) {
            popupContent += `<br>${party}: ${result.seatsWon[party]}`;
          }
        });
      } else {
        // Optional: Indicate if seat data is missing even if winner is known
        // popupContent += `<br>(Të dhënat e mandateve mungojnë)`; // Optional translated message
      }
    } else {
      popupContent += `<br>Fituesi: Në Pritje`; // Translated "Winner: TBD"
    }
  } else {
    popupContent += `<br>Nuk ka të dhëna`; // Translated "No data available"
  }
  // Make sure popup updates if underlying data changes (more robust)
  layer.bindPopup(
    () => {
      // Re-fetch result based on currentElectionResults when popup opens
      const currentResult = currentElectionResults[regionName];
      let currentPopupContent = `<div class="popup-content font-mono text-sm max-h-60 overflow-y-auto">
                                 <div class="font-bold text-base mb-2 border-b pb-1">${regionName}</div>`; // Title

      if (
        currentResult &&
        currentResult.seatsWon &&
        Object.keys(currentResult.seatsWon).length > 0
      ) {
        // Sort parties by seats won (descending)
        const sortedParties = Object.keys(currentResult.seatsWon).sort(
          (a, b) => currentResult.seatsWon[b] - currentResult.seatsWon[a]
        );

        currentPopupContent += `<div class="space-y-1">`; // Container for party rows

        sortedParties.forEach((party) => {
          const seats = currentResult.seatsWon[party];
          if (seats > 0) {
            const partyColor = partyColors[party] || partyColors["Other"];
            const isWinner = party === currentResult.winner;
            // Use light color for background if winner
            const backgroundStyle = isWinner
              ? `background-color: ${
                  partyColorsLight[party] || partyColorsLight["Other"]
                };`
              : "";
            const partyLogoHtml = `<img 
                                  src="logos/${party}.png" 
                                  alt="${party}" 
                                  class="w-4 h-4 inline-block align-middle" 
                                  onerror="this.onerror=null; this.src='logos/${party}.svg'; this.onerror=function(){ this.style.display='none'; };"
                                >`;
            const partyDisplayName = partyNames[party] || party; // Use full name if available, else code

            // Build the row for this party
            currentPopupContent += `<div class="flex items-center border-b border-gray-100 last:border-b-0 py-1" style="${backgroundStyle}">
              <span class="inline-block w-1 h-4 mr-2 flex-shrink-0" style="background-color: ${partyColor};"></span>
              <span class="flex-grow flex items-center gap-1.5">
                ${partyLogoHtml}
                <span class="font-semibold">${partyDisplayName}</span>
              </span>
              <span class="font-bold text-right w-8">${seats}</span>
            </div>`;
          }
        });
        currentPopupContent += `</div>`; // Close container
      } else {
        // Handle case with no data or TBD
        currentPopupContent += `<div class="text-gray-600 italic">Mandatet në pritje...</div>`;
      }

      currentPopupContent += `</div>`; // Close popup-content div
      return currentPopupContent;
    },
    {
      autoPanPadding: L.point(50, 75), // Add padding (x: 50, y: 75) for auto-pan
      // You might need to adjust these values
    }
  );

  // Highlight and Popup Interactions
  layer.on({
    mouseover: (e) => {
      const currentLayer = e.target;
      currentLayer.setStyle({
        weight: 3,
        color: "#666",
        fillOpacity: 0.9,
      });
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        currentLayer.bringToFront();
      }
      // Open popup on hover for non-touch devices
      if (!L.Browser.touch) {
        console.log(
          "Mouseover detected, unbinding tooltip & opening popup for:",
          regionName
        ); // Updated log
        // Temporarily remove tooltip to avoid potential conflict
        currentLayer.unbindTooltip();
        currentLayer.openPopup();
      }
    },
    mouseout: (e) => {
      if (geoJsonLayer) {
        geoJsonLayer.resetStyle(e.target);
      }
      // Close popup and rebind tooltip on mouseout for non-touch devices
      if (!L.Browser.touch) {
        console.log(
          "Mouseout detected, closing popup & rebinding tooltip for:",
          regionName
        ); // Updated log
        e.target.closePopup();
      }
    },
    click: (e) => {
      // Optional: Zoom to feature on click (currently disabled)
      // map.fitBounds(e.target.getBounds());

      // Ensure popup opens on click for touch devices
      if (L.Browser.touch) {
        e.target.openPopup();
      }
    },
  });
}

// --- Function to Load Data and Refresh Map via API ---
async function fetchAndUpdateMap() {
  console.log("Fetching latest election data from API...");
  try {
    // Add timestamp to prevent caching
    const response = await fetch(apiUrl + "?t=" + Date.now());
    if (!response.ok) {
      if (response.status === 404) {
        console.log("API endpoint not found or no data available yet.");
        // Optionally clear map or show default state?
        // currentElectionResults = {}; // Reset if needed
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return; // Don't proceed if fetch failed
    }
    const newData = await response.json();

    // Check if data has actually changed
    if (JSON.stringify(newData) !== JSON.stringify(currentElectionResults)) {
      console.log("Data changed, updating map...");
      currentElectionResults = newData;
      updateHeaderData(currentElectionResults);
      if (geoJsonLayer) {
        geoJsonLayer.setStyle(styleRegion);
        // Popups will update automatically when opened due to bindPopup change
      }
    } else {
      console.log("No change in API data.");
    }
  } catch (e) {
    console.error("Error fetching or processing data from API:", e);
  }
}

// --- Initial GeoJSON Fetch and Setup ---
fetch(geoJsonPath)
  .then((response) => {
    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}. Could not load ${geoJsonPath}`
      );
    }
    return response.json();
  })
  .then(async (data) => {
    // Make this callback async to await initial fetch
    // Initial fetch before creating layer to have data ready
    await fetchAndUpdateMap();

    geoJsonLayer = L.geoJSON(data, {
      style: styleRegion,
      onEachFeature: onEachRegion,
    }).addTo(map);
    console.log("GeoJSON loaded successfully.");

    // --- Focus map logic ---
    const bounds = geoJsonLayer.getBounds();
    map.fitBounds(bounds);
    const boundsCenter = bounds.getCenter(); // Get the bounds center
    const fitZoom = map.getZoom();
    console.log("Zoom level after fitBounds:", fitZoom);
    const targetZoom = fitZoom + 0.5;
    console.log("Target zoom level for setView:", targetZoom);
    // Adjust the center: Decrease latitude (down), Increase longitude (right)
    const adjustedCenter = L.latLng(
      boundsCenter.lat - 0.2,
      boundsCenter.lng + 0.4
    );
    map.setView(adjustedCenter, targetZoom); // Use the adjusted center
    console.log("Actual zoom level after setView:", map.getZoom());
    map.setMaxBounds(bounds.pad(0.6));
    // map.setMinZoom(map.getZoom());

    // --- Initial Header Update ---
    updateHeaderData(currentElectionResults); // Update header with initial data

    // --- Start checking for updates periodically ---
    setInterval(fetchAndUpdateMap, updateInterval);

    // REMOVED storage event listener
  })
  .catch((error) => {
    console.error("Gabim gjatë ngarkimit të GeoJSON:", error);
    document.getElementById(
      "map"
    ).innerHTML = `<p style="color: red; text-align: center; padding: 20px;">
                Gabim gjatë ngarkimit të të dhënave të hartës. Sigurohuni që '${geoJsonPath}' është në vendin e duhur dhe e vlefshme.
                <br>Kontrolloni konsolën e shfletuesit (F12) për më shumë detaje.
                </p>`;
    updateHeaderData(null);
  });

// --- Header Bar Update ---
// Calculates totals based on seats won (requires 'seatsWon' in electionResults to be filled)
function updateHeaderData(results) {
  let partySeats = {}; // Store total seats for each party
  let totalSeatsCounted = 0; // Should approach 140 as results come in

  // Initialize seat counts for all known parties
  for (const partyCode in partyColors) {
    if (partyCode !== "Other" && partyCode !== "TBD") {
      partySeats[partyCode] = 0;
    }
  }

  if (results) {
    // Sum seats won per party across all regions
    for (const region in results) {
      if (results[region] && results[region].seatsWon) {
        for (const party in results[region].seatsWon) {
          if (partySeats.hasOwnProperty(party)) {
            partySeats[party] += results[region].seatsWon[party];
            totalSeatsCounted += results[region].seatsWon[party]; // Add to overall counted seats
          } else {
            // Handle unexpected parties if necessary (e.g., add to an 'Other' category)
            console.warn(
              `Unexpected party code found: ${party} in region ${region}`
            );
          }
        }
      }
    }
  }

  // --- Update Header Info (Seats/Percentages for PS and ASHM remain for now) ---
  const party1Code = "PS";
  const party2Code = "ASHM";

  const party1TotalSeats = partySeats[party1Code] || 0;
  const party2TotalSeats = partySeats[party2Code] || 0;

  const party1Percentage =
    totalNationalSeats > 0
      ? ((party1TotalSeats / totalNationalSeats) * 100).toFixed(1)
      : 0;
  const party2Percentage =
    totalNationalSeats > 0
      ? ((party2TotalSeats / totalNationalSeats) * 100).toFixed(1)
      : 0;

  document.getElementById("party1-votes").textContent = party1TotalSeats;
  document.getElementById(
    "party1-percentage"
  ).textContent = `${party1Percentage}%`;
  document.getElementById("party2-votes").textContent = party2TotalSeats;
  document.getElementById(
    "party2-percentage"
  ).textContent = `${party2Percentage}%`;

  // --- Dynamically Update the Progress Bar ---
  const barContainer = document.querySelector(".center-bar");
  if (!barContainer) return;
  barContainer.innerHTML = ""; // Clear existing bars

  // Create bar segments for parties with seats
  let barSegments = [];
  for (const partyCode in partySeats) {
    if (partySeats[partyCode] > 0) {
      const percentage = (partySeats[partyCode] / totalNationalSeats) * 100;
      barSegments.push({
        party: partyCode,
        seats: partySeats[partyCode],
        width: percentage,
        color: partyColors[partyCode] || partyColors["Other"], // Fallback color
      });
    }
  }

  // Sort segments (e.g., descending by seats, then alphabetically)
  barSegments.sort((a, b) => {
    if (b.seats !== a.seats) {
      return b.seats - a.seats; // Higher seats first
    }
    return a.party.localeCompare(b.party); // Alphabetical tiebreaker
  });

  // Get reference to the info display element
  const infoDisplay = document.getElementById("bar-info-display");
  if (!infoDisplay) {
    console.error("Element with ID 'bar-info-display' not found.");
  }

  // Append new segments to the bar
  barSegments.forEach((segment) => {
    const segmentDiv = document.createElement("div");
    segmentDiv.className = "bar-fill h-full cursor-pointer"; // Added cursor-pointer
    segmentDiv.style.width = `${segment.width}%`;
    segmentDiv.style.backgroundColor = segment.color;
    segmentDiv.title = `${segment.party}: ${segment.seats} Mandate`;
    barContainer.appendChild(segmentDiv);

    // Event listeners for hover/click
    const logoHtml = `<img 
      src="logos/${segment.party}.png" 
      alt="${segment.party}" 
      class="w-4 h-4 inline-block align-middle" 
      onerror="this.onerror=null; this.src='logos/${segment.party}.svg'; this.onerror=function(){ this.style.display='none'; };"
    >`;
    const infoHtml = `${logoHtml}<span>${segment.party}: ${segment.seats} Mandate</span>`;

    segmentDiv.addEventListener("mouseover", () => {
      if (infoDisplay) infoDisplay.innerHTML = infoHtml;
    });
    segmentDiv.addEventListener("mouseout", () => {
      if (infoDisplay) infoDisplay.innerHTML = "&nbsp;"; // Reset on mouse out
    });
    segmentDiv.addEventListener("click", () => {
      if (infoDisplay) infoDisplay.innerHTML = infoHtml; // Same action on click for mobile
    });
  });

  // Target line is now handled statically in HTML, removing JS updates for it.
}
