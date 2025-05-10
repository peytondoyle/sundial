let currentLat = null;
let currentLon = null;

// Tooltip toggle
document.addEventListener("DOMContentLoaded", () => {
  const icon = document.getElementById("info-icon");
  const tooltip = document.getElementById("info-tooltip");

  icon?.addEventListener("click", () => tooltip.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!icon.contains(e.target) && !tooltip.contains(e.target)) {
      tooltip.classList.add("hidden");
    }
  });
});

// 🌍 Location & initial load
function requestLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    currentLat = parseFloat(position.coords.latitude).toFixed(6);
    currentLon = parseFloat(position.coords.longitude).toFixed(6);

    document.getElementById("locationModal").style.display = "none";

    try {
      await getSunGoodness(currentLat, currentLon);
      const sunTimes = await getSunMetadata(currentLat, currentLon);
      await getHourlyForecast(currentLat, currentLon, sunTimes);
    } catch (err) {
      console.warn("Could not load forecast timeline:", err);
      document.getElementById("timeline-list").innerHTML =
        `<li style="opacity: 0.6; text-align:center;">Forecast temporarily unavailable.</li>`;
    }

    document.querySelector("main").classList.add("show");
  });
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
        "Nearly perfect skies — ideal for sun lovers!",
        "Stunningly clear — soak it up.",
        "This is peak sunlight — don’t miss it!",
        "Golden hour is about to be breathtaking.",
        "Sky’s basically begging you to go outside."
    ],
    80: [
        "Clear and bright — a great time to be outside.",
        "Sun’s out and showing off.",
        "Almost all clear — sunglasses recommended.",
        "It’s a good day for a walk.",
        "Visibility and vibes are high."
    ],
    70: [
        "Mostly clear, with some mild haze or clouds.",
        "You’ll see sunbeams between the fluff.",
        "Patchy clouds, but still pleasant.",
        "Kind of a soft light, but still bright.",
        "Decent clarity with a few sky interruptions."
    ],
    60: [
        "Some clouds are drifting through.",
        "Still some light — not bad at all.",
        "Sky’s playing peekaboo with the sun.",
        "Not perfect, but not gloomy either.",
        "Scattered clouds — bring your optimism."
    ],
    50: [
        "Split decision — half sun, half clouds.",
        "A little murky, but there’s still light.",
        "Moderate conditions — manage expectations.",
        "You might squint... occasionally.",
        "The sun’s trying — just not its hardest."
    ],
    40: [
        "More clouds than clear sky.",
        "You’ll notice the difference today.",
        "On the dimmer side of things.",
        "Filtered sunlight at best.",
        "Muted vibes all around."
    ],
    30: [
        "Getting gloomy now.",
        "Not much light sneaking through.",
        "Pretty overcast — not ideal.",
        "Sun’s having a shy day.",
        "Probably a good day for soft lighting."
    ],
    20: [
        "Clouds have taken over.",
        "Very little sun making an appearance.",
        "Gray dominates the scene.",
        "Bleak lighting — moody vibes.",
        "Clouds win today."
    ],
    10: [
        "Barely any sun at all.",
        "Heavy gloom — dramatic, but not bright.",
        "Hope you weren’t planning sunbathing.",
        "Full cloud cover, full stop.",
        "Darkness reigns (for now)."
    ],
    0: [
        "Zero sun detected — the void beckons.",
        "Fully moody. Light who?",
        "Blackout skies — cue the candles.",
        "Even the sun took a sick day.",
        "Not even trying today."
    ]
    };

    // Find correct tier
    const tier = Math.floor(score / 10) * 10;
    const messages = contextMessages[tier] || ["Conditions unclear."];

    // Pick one randomly
    if (context) {
    context.textContent = messages[Math.floor(Math.random() * messages.length)];
    }

    // 🌈 Set background gradient and theme color
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

    // Update progress bar
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

// 🧠 Mood by score
function getVibe(score) {
  if (score > 90) return "Stunning skies!";
  if (score > 75) return "Gorgeous and glowing";
  if (score > 60) return "Pretty clear";
  if (score > 40) return "Some clouds";
  if (score > 20) return "Gloomy";
  return "Moody gray";
}

// 🎨 Dot by phase label
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

// ☀️ Pull sun metadata
async function getSunMetadata(lat, lon) {
  const res = await fetch(`/api/suntimes?lat=${lat}&lon=${lon}`);
  return await res.json();
}

// 🔢 Score 1 point
function scoreForecastPoint(point) {
  let score = 100;
  score -= (point.values.cloudCover || 0) * 0.6;
  score -= (point.values.humidity || 0) * 0.2;
  if ((point.values.visibility || 10000) < 5000) score -= 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// 🕐 Timeline phase scoring
async function getHourlyForecast(lat, lon, sunTimes) {
  const res = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error("Forecast failed");
  const intervals = await res.json();
  if (!Array.isArray(intervals) || intervals.length === 0) throw new Error("No forecast data");
  console.log("⏱ Forecast API Intervals:", intervals);

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

// 🖼️ Build timeline list
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

// 🔁 Manual reload
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

// Attribution toggle
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("attribution-toggle");
    const tooltip = document.getElementById("attribution-tooltip");
  
    if (toggleBtn && tooltip) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        tooltip.classList.toggle("hidden");
      });
  
      document.addEventListener("click", (e) => {
        if (!tooltip.contains(e.target) && !toggleBtn.contains(e.target)) {
          tooltip.classList.add("hidden");
        }
      });
    }
  });