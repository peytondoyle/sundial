
let currentLat = null;
let currentLon = null;

// Tooltip toggle and button handling
document.addEventListener("DOMContentLoaded", () => {
    // 🚀 Bind all location trigger buttons
    document.querySelectorAll(".loc-trigger").forEach(btn =>
      btn.addEventListener("click", requestLocation)
    );
  
    // ℹ️ Info tooltip toggle
    const infoIcon = document.getElementById("info-icon");
    const infoTooltip = document.getElementById("info-tooltip");
  
    infoIcon?.addEventListener("click", () => {
      infoTooltip?.classList.toggle("hidden");
    });
  
    // 💬 Attribution tooltip toggle
    const attrToggle = document.getElementById("attribution-toggle");
    const attrTooltip = document.getElementById("attribution-tooltip");
  
    attrToggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      attrTooltip?.classList.toggle("hidden");
    });
  
    // 🌐 Global click closes tooltips
    document.addEventListener("click", (e) => {
      if (!infoIcon?.contains(e.target) && !infoTooltip?.contains(e.target)) {
        infoTooltip?.classList.add("hidden");
      }
      if (!attrToggle?.contains(e.target) && !attrTooltip?.contains(e.target)) {
        attrTooltip?.classList.add("hidden");
      }
    });
  });

// 🌍 Location & initial load
function requestLocation() {
    const status = document.getElementById("statusMessage");
    if (status) status.textContent = "Requesting location...";
  
    if (!navigator.geolocation) {
      alert("Geolocation not supported by this browser.");
      console.warn("Geolocation not supported.");
      if (status) status.textContent = "Geolocation not supported by your browser.";
      return;
    }
  
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        currentLat = parseFloat(position.coords.latitude).toFixed(6);
        currentLon = parseFloat(position.coords.longitude).toFixed(6);
  
        if (status) status.textContent = "Location access granted.";
        document.getElementById("locationModal").style.display = "none";
  
        try {
          // ⛅ Load sun score and forecast
          await getSunGoodness(currentLat, currentLon);
          const sunTimes = await getSunMetadata(currentLat, currentLon);
          await getHourlyForecast(currentLat, currentLon, sunTimes);
  
          // 📍 Try to get ZIP code via reverse geocoding
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}`);
          const locationData = await res.json();
          const zip = locationData?.address?.postcode || null;
  
          // 📝 Update context message with ZIP
          const context = document.getElementById("score-context");
          if (zip && context && !context.textContent.includes(zip)) {
            context.textContent = `${context.textContent} in ${zip}`;
          }
  
        } catch (err) {
          console.warn("Could not load forecast timeline:", err);
          document.getElementById("timeline-list").innerHTML =
            `<li style="opacity: 0.6; text-align:center;">Forecast temporarily unavailable.</li>`;
        }
  
        document.querySelector("main").classList.add("show");
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("We couldn't access your location. Please check your browser permissions.");
        if (status) status.textContent = "Location blocked. Please check your browser settings.";
      }
    );
  }

// ☀️ Overall sky score (NOW)
async function getSunGoodness(lat, lon) {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    console.log("🌤 Weather API Response:", data);

    const clouds = data?.clouds?.all ?? 0;
    const humidity = data?.main?.humidity ?? 0;
    const visibility = data?.visibility ?? 10000;
    const sunrise = data?.sys?.sunrise ?? 0;
    const sunset = data?.sys?.sunset ?? 0;
    const now = Math.floor(Date.now() / 1000);

    let score = 100;
    score -= clouds * 0.6;
    score -= humidity * 0.2;
    if (visibility < 5000) score -= 15;
    if (Math.abs(now - sunrise) < 3600 || Math.abs(now - sunset) < 3600) score += 10;

    score = Math.max(0, Math.min(100, Math.round(score)));

    document.getElementById("score").textContent = `${score}%`;
    document.getElementById("description").textContent = getVibe(score);

    const context = document.getElementById("score-context");

    const contextMessages = {
        90: [
          "Nearly perfect skies — ideal for sun lovers",
          "Stunningly clear — soak it up",
          "Peak sunlight shining down",
          "Golden hour will be breathtaking",
          "Skies are begging you to go outside"
        ],
        80: [
          "Clear and bright vibes",
          "The sun’s showing off",
          "Hardly a cloud to be found",
          "A great walk day ahead",
          "Visibility and vibes are high"
        ],
        70: [
          "Mostly clear skies with soft light",
          "Some sunbeams peeking through",
          "Pleasantly patchy skies",
          "A bit hazy but still nice",
          "Mild clouds and good vibes"
        ],
        60: [
          "Some drifting clouds",
          "Still fairly bright out",
          "Peekaboo sun playing through",
          "A mix of clouds and light",
          "Scattered but hopeful skies"
        ],
        50: [
          "A real 50/50 sky day",
          "Bit murky but manageable",
          "Some sun, some shade",
          "A moderately lit day",
          "The sun’s trying its best"
        ],
        40: [
          "More clouds than clarity",
          "You’ll notice a gray tint",
          "Soft, dim lighting overhead",
          "Filtered sunlight at best",
          "A muted mood hangs overhead"
        ],
        30: [
          "It’s looking overcast",
          "Very little light sneaking through",
          "Not much brightness to work with",
          "The sun’s hiding today",
          "It’s pretty gloomy out"
        ],
        20: [
          "Cloud cover dominates",
          "Almost no sunlight breaking through",
          "Gray skies stretch across",
          "A bleak, moody vibe",
          "Clouds fully own the sky"
        ],
        10: [
          "It’s nearly full gloom",
          "Barely a ray of sunshine",
          "Sunbathing? Not happening",
          "Complete cloud cover",
          "A moody, heavy sky"
        ],
        0: [
          "No sunlight detected",
          "The void reigns overhead",
          "Skies are pitch and brooding",
          "Even the sun skipped town",
          "Dark, dramatic skies"
        ]
      };

    const tier = Math.floor(score / 10) * 10;
    const messages = contextMessages[tier] || ["Conditions unclear."];
    const recap = messages[Math.floor(Math.random() * messages.length)];

    if (context) {
      context.textContent = recap;
    }

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then((locData) => {
        const zip = locData?.address?.postcode;
        if (zip && context?.textContent) {
          context.textContent = `${context.textContent} in ${zip}`;
        }
      })
      .catch((err) => {
        console.warn("ZIP lookup failed:", err);
      });

    const body = document.body;
    let gradient, themeColor;

    if (score >= 90) {
      gradient = "linear-gradient(to top right, #f4c879, #d49c00)";
      themeColor = "#d49c00";
    } else if (score >= 75) {
      gradient = "linear-gradient(to top right, #e8a0d5, #8a9dd4)";
      themeColor = "#8a9dd4";
    } else if (score >= 60) {
      gradient = "linear-gradient(to top right, #a8cbb0, #bcd2c0)";
      themeColor = "#8ba89b";
    } else if (score >= 40) {
      gradient = "linear-gradient(to top right, #bdc3c7, #2c3e50)";
      themeColor = "#2c3e50";
    } else if (score >= 20) {
      gradient = "linear-gradient(to top right, #667db6, #485563)";
      themeColor = "#485563";
    } else {
      gradient = "linear-gradient(to top right, #232526, #414345)";
      themeColor = "#414345";
    }

    body.style.background = gradient;
    document.documentElement.style.setProperty("--theme-color", themeColor);

    const isBright = score >= 65;
    document.body.setAttribute("data-brightness", isBright ? "light" : "dark");

    const barFill = document.getElementById("focus-fill");
    const barScore = document.getElementById("focus-score");
    const barLabel = document.getElementById("focus-title");
    const barVibe = document.getElementById("focus-label");

    if (barFill && barScore) {
      barFill.style.width = `${score}%`;
      barScore.textContent = `${score}%`;
      if (barLabel) barLabel.textContent = "Current Conditions";
      if (barVibe) barVibe.textContent = getVibe(score);
    }
  } catch (err) {
    console.error("❌ Weather fetch failed:", err);
    document.getElementById("score").textContent = "--%";
    document.getElementById("description").textContent = "Failed to load";
  }
}

function getVibe(score) {
  if (score > 90) return "Stunning skies!";
  if (score > 75) return "Gorgeous and glowing";
  if (score > 60) return "Pretty clear";
  if (score > 40) return "Some clouds";
  if (score > 20) return "Gloomy";
  return "Moody gray";
}

function getDotClass(phase) {
  const map = {
    "First Light": "dot-blue",
    "Sunrise": "dot-orange",
    "Golden Hour": "dot-yellow",
    "Midday": "dot-white",
    "Sunset": "dot-red",
    "Last Light": "dot-purple"
  };
  return map[phase] || "dot-gray";
}

async function getSunMetadata(lat, lon) {
  const res = await fetch(`/api/suntimes?lat=${lat}&lon=${lon}`);
  return await res.json();
}

function scoreForecastPoint(point) {
  let score = 100;
  score -= (point.values.cloudCover || 0) * 0.6;
  score -= (point.values.humidity || 0) * 0.2;
  if ((point.values.visibility || 10000) < 5000) score -= 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function getHourlyForecast(lat, lon, sunTimes) {
  const res = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error("Forecast failed");
  const intervals = await res.json();
  if (!Array.isArray(intervals) || intervals.length === 0) throw new Error("No forecast data");

  const phases = [
    { label: "First Light", key: "civil_twilight_begin" },
    { label: "Sunrise", key: "sunrise" },
    { label: "Golden Hour", key: "sunrise", offset: 30 },
    { label: "Midday", key: "solar_noon" },
    { label: "Golden Hour", key: "sunset", offset: -30 },
    { label: "Sunset", key: "sunset" },
    { label: "Last Light", key: "civil_twilight_end" },
  ];

  const timeline = phases.map((phase) => {
    const time = new Date(new Date(sunTimes[phase.key]).getTime() + (phase.offset || 0) * 60000);
    const closest = intervals.reduce((best, point) => {
      const diff = Math.abs(new Date(point.startTime) - time);
      return !best || diff < Math.abs(new Date(best.startTime) - time) ? point : best;
    }, null);
    return {
      label: phase.label,
      timestamp: time,
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      score: closest ? scoreForecastPoint(closest) : "--",
    };
  });

  renderTimeline(timeline);
}

function renderTimeline(phases) {
  const list = document.getElementById("timeline-list");
  const timeText = document.getElementById("focus-time");
  const agoText = document.getElementById("focus-ago");

  list.innerHTML = "";
  if (!phases.length) return;

  const now = new Date();
  const current = phases.find(p => now < p.timestamp) || phases[phases.length - 1];

  if (timeText && agoText) {
    timeText.textContent = current.time;
    const diff = Math.round((current.timestamp - now) / 60000);
    agoText.textContent = diff < 0 ? `(${Math.abs(diff)}m ago)` : `(${diff}m from now)`;
  }

  phases.forEach((p) => {
    const li = document.createElement("li");
    li.className = "timeline-item";
    li.innerHTML = `
      <span class="label">
        <span class="dot ${getDotClass(p.label)}"></span> ${p.label}
      </span>
      <span class="meta">
        <span class="score">${p.score === "--" ? "--" : p.score + "%"}</span>
        <span class="time">${p.time}</span>
      </span>
    `;
    list.appendChild(li);
  });
}

function refresh() {
  if (!currentLat || !currentLon) return;
  getSunGoodness(currentLat, currentLon);
  getSunMetadata(currentLat, currentLon)
    .then((sunTimes) => getHourlyForecast(currentLat, currentLon, sunTimes))
    .catch(() => {
      document.getElementById("timeline-list").innerHTML =
        `<li style="opacity: 0.6;">Forecast temporarily unavailable.</li>`;
    });
}