// Define the structure and initial state (used if fetch fails)
const initialElectionResultsStructure = {
  Berat: { totalSeats: 7, winner: null, seatsWon: {} },
  Dibër: { totalSeats: 5, winner: null, seatsWon: {} },
  Durrës: { totalSeats: 14, winner: null, seatsWon: {} },
  Elbasan: { totalSeats: 14, winner: null, seatsWon: {} },
  Fier: { totalSeats: 16, winner: null, seatsWon: {} },
  Gjirokastër: { totalSeats: 4, winner: null, seatsWon: {} },
  Korçë: { totalSeats: 10, winner: null, seatsWon: {} },
  Kukës: { totalSeats: 3, winner: null, seatsWon: {} },
  Lezhë: { totalSeats: 7, winner: null, seatsWon: {} },
  Shkodër: { totalSeats: 11, winner: null, seatsWon: {} },
  Tiranë: { totalSeats: 37, winner: null, seatsWon: {} },
  Vlorë: { totalSeats: 12, winner: null, seatsWon: {} },
};

// --- Key Parties for Form Inputs ---
const formParties = ["PS", "ASHM", "LB", "KEA", "NSHB", "DZH", "PM", "PSD"];

const apiUrl = "/api/results";
const loginUrl = "/api/login"; // New endpoint for login
const statusElement = document.getElementById("save-status");
const passwordSection = document.getElementById("password-section");
const passwordInput = document.getElementById("password-input");
const passwordSubmit = document.getElementById("password-submit");
const passwordError = document.getElementById("password-error");
const formContentSection = document.getElementById("form-content");

let currentResultsData = {};

// --- Login Function ---
async function attemptLogin() {
  const password = passwordInput.value;
  passwordError.textContent = ""; // Clear previous errors

  if (!password) {
    passwordError.textContent = "Fjalëkalimi nuk mund të jetë bosh.";
    return;
  }

  try {
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: password }),
    });

    const data = await response.json();

    if (response.ok && data.authenticated) {
      console.log("Login successful");
      passwordSection.classList.add("hidden");
      formContentSection.classList.remove("hidden");
      // Load data and generate form ONLY after successful login
      currentResultsData = await loadResultsFromAPI();
      generateEntryForm(currentResultsData);
    } else {
      console.log("Login failed");
      passwordError.textContent = "Fjalëkalim i gabuar.";
      passwordInput.value = ""; // Clear password field
    }
  } catch (e) {
    console.error("Login API error:", e);
    passwordError.textContent = "Gabim në komunikimin me serverin për hyrjen.";
  }
}

// --- Load results from API (minor change: status update) ---
async function loadResultsFromAPI() {
  // Status update moved to generateEntryForm or handled differently
  // statusElement.textContent = "Duke ngarkuar të dhënat aktuale...";
  try {
    const response = await fetch(apiUrl + "?t=" + Date.now());
    if (!response.ok) {
      if (response.status === 404) {
        console.log(
          "API endpoint not found or no data yet, using initial structure."
        );
        // Ensure status element exists before updating
        if (statusElement) {
          statusElement.textContent = "Gabim në ngarkimin e të dhënave!";
          statusElement.className = "mt-2 text-sm text-red-700";
        }
        return JSON.parse(JSON.stringify(initialElectionResultsStructure));
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    const data = await response.json();
    console.log("Loaded results from API.");
    // Ensure status element exists before updating
    if (statusElement) {
      statusElement.textContent = "";
    }
    return data;
  } catch (e) {
    console.error("Error loading from API:", e);
    // Ensure status element exists before updating
    if (statusElement) {
      statusElement.textContent = "Gabim në ngarkimin e të dhënave!";
      statusElement.className = "mt-2 text-sm text-red-700";
    }
    return JSON.parse(JSON.stringify(initialElectionResultsStructure));
  }
}

// --- Generate the form inputs dynamically ---
function generateEntryForm(results) {
  const container = document.getElementById("region-inputs");
  if (!container) return;
  container.innerHTML = ""; // Clear placeholder/old inputs

  const regionNames = Object.keys(results).sort();

  regionNames.forEach((regionName) => {
    const regionData = results[regionName];
    const regionDiv = document.createElement("div");
    regionDiv.className = "p-3 pb-4 border rounded bg-gray-50 shadow-sm";

    const titleLabel = document.createElement("label");
    titleLabel.className =
      "block font-medium text-gray-700 mb-2 text-center border-b pb-1";
    titleLabel.textContent = `${regionName} (${regionData.totalSeats} Mandate)`;
    regionDiv.appendChild(titleLabel);

    // Create inputs for the specified parties
    formParties.forEach((partyCode) => {
      const partySeats = regionData.seatsWon[partyCode] || 0;
      const inputId = `input-${regionName}-${partyCode}`;

      const partyDiv = document.createElement("div");
      partyDiv.className = "flex items-center space-x-2 mt-2";

      // Logo Image
      const logoImg = document.createElement("img");
      // Try PNG first by default
      logoImg.src = `logos/${partyCode}.png`;
      logoImg.alt = `${partyCode} logo`;
      logoImg.className = "w-5 h-5 object-contain flex-shrink-0";
      // Add error handler for missing logos - try SVG if PNG fails
      logoImg.onerror = function () {
        // Try SVG if PNG fails
        const svgSrc = `logos/${partyCode}.svg`;
        if (this.src !== svgSrc) {
          // Avoid infinite loop if SVG also fails
          console.log(`logos/${partyCode}.png not found, trying .svg`);
          this.src = svgSrc;
          // Reset error handler for the SVG attempt
          this.onerror = function () {
            console.log(`logos/${partyCode}.svg also not found.`);
            this.style.display = "none"; // Hide if SVG also fails
            label.classList.remove("w-10");
            label.classList.add("w-14");
          };
        } else {
          // SVG failed too (this.src is already the svgSrc)
          console.log(`logos/${partyCode}.svg failed to load.`);
          this.style.display = "none";
          label.classList.remove("w-10");
          label.classList.add("w-14");
        }
      };
      partyDiv.appendChild(logoImg);

      // Label
      const label = document.createElement("label");
      label.htmlFor = inputId;
      label.className = "w-10 text-sm flex-shrink-0 text-right";
      label.textContent = `${partyCode}:`;
      partyDiv.appendChild(label);

      // Input
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = regionData.totalSeats;
      input.id = inputId;
      input.dataset.region = regionName;
      input.dataset.party = partyCode;
      input.value = partySeats;
      // Adjusted width slightly
      input.className =
        "w-14 p-1 border border-gray-300 rounded text-sm result-input";
      partyDiv.appendChild(input);
      regionDiv.appendChild(partyDiv);
    });
    container.appendChild(regionDiv);
  });
}

// --- Save results via API POST request ---
async function saveResultsViaAPI() {
  console.log("Attempting to save results via API...");
  statusElement.textContent = "Duke ruajtur...";
  statusElement.className = "mt-2 text-sm text-orange-600"; // Indicate processing

  const inputs = document.querySelectorAll("#region-inputs .result-input");
  // Start with the currently loaded data structure to preserve totalSeats etc.
  let resultsToSave = JSON.parse(JSON.stringify(currentResultsData));

  // Clear old seatsWon and gather data from form
  for (const region in resultsToSave) {
    resultsToSave[region].seatsWon = {}; // Clear existing seats for the region
  }
  inputs.forEach((input) => {
    const region = input.dataset.region;
    const party = input.dataset.party;
    const seats = parseInt(input.value, 10);

    if (!isNaN(seats) && seats >= 0 && resultsToSave[region]) {
      if (seats > 0) {
        resultsToSave[region].seatsWon[party] = seats;
      }
    } else if (resultsToSave[region]) {
      delete resultsToSave[region].seatsWon[party];
      input.value = 0;
    }
  });

  // Recalculate winners and validate totals
  for (const region in resultsToSave) {
    let winningParty = null;
    let maxSeats = -1;
    let tie = false;
    const currentSeats = resultsToSave[region].seatsWon;
    let regionTotalSeats = 0;

    for (const party in currentSeats) {
      const seats = currentSeats[party];
      regionTotalSeats += seats;
      if (seats > maxSeats) {
        maxSeats = seats;
        winningParty = party;
        tie = false;
      } else if (seats === maxSeats) {
        tie = true;
      }
    }
    if (regionTotalSeats > resultsToSave[region].totalSeats) {
      statusElement.textContent = `Gabim: ${region} ka ${regionTotalSeats} mandate, por totali është ${resultsToSave[region].totalSeats}! Nuk u ruajt.`;
      statusElement.className = "mt-2 text-sm text-red-700";
      console.error(`Error: Seat count mismatch for ${region}.`);
      return;
    }
    if (tie && maxSeats > 0) {
      resultsToSave[region].winner = "Other";
    } else {
      resultsToSave[region].winner = maxSeats > 0 ? winningParty : null;
    }
  }

  // Send data to API
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add authentication headers if needed (e.g., API key)
        // 'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: JSON.stringify(resultsToSave),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const responseData = await response.json(); // Assuming API confirms success
    console.log("API Save Response:", responseData);
    statusElement.textContent = "Rezultatet u ruajtën me sukses në server!";
    statusElement.className = "mt-2 text-sm text-green-700";
    currentResultsData = resultsToSave; // Update local state after successful save
    setTimeout(() => {
      statusElement.textContent = "";
    }, 3000);
  } catch (e) {
    console.error("Error saving to API:", e);
    statusElement.textContent = "Gabim gjatë ruajtjes në server!";
    statusElement.className = "mt-2 text-sm text-red-700";
  }
}

// --- Initial Setup ---
document.addEventListener("DOMContentLoaded", () => {
  // Add event listener for password submit
  if (passwordSubmit && passwordInput) {
    passwordSubmit.addEventListener("click", attemptLogin);
    // Allow login on pressing Enter in password field
    passwordInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault(); // Prevent default form submission if any
        attemptLogin();
      }
    });
  }

  // Do NOT load data or generate form initially. Wait for login.
  // currentResultsData = await loadResultsFromAPI();
  // generateEntryForm(currentResultsData);

  const saveButton = document.getElementById("save-results-button");
  if (saveButton) {
    saveButton.addEventListener("click", saveResultsViaAPI);
  }
});
