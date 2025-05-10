function requestLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      return;
    }
  
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
  
      document.getElementById('locationModal').style.display = 'none';
  
      getSunGoodness(lat, lon);
      getSunTimeline(lat, lon);
    });
  }

function getSunGoodness() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      return;
    }
  
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      getSunTimeline(lat, lon);
  
      try {
        const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await response.json();
  
        if (!data || !data.clouds || !data.main || !data.sys) {
          console.error("Malformed or missing weather data:", data);
          document.getElementById('score').textContent = "--%";
          document.getElementById('description').textContent = "Invalid weather data";
          return;
        }
  
        const clouds = data.clouds.all;
        const humidity = data.main.humidity;
        const visibility = data.visibility;
        const sunrise = data.sys.sunrise;
        const sunset = data.sys.sunset;
        const now = Math.floor(Date.now() / 1000);
  
        let score = 100;
        score -= clouds * 0.6;
        score -= humidity * 0.2;
        if (visibility < 5000) score -= 15;
        if (Math.abs(now - sunrise) < 3600 || Math.abs(now - sunset) < 3600) {
          score += 10;
        }
  
        score = Math.max(0, Math.min(100, Math.round(score)));
  
        document.getElementById('score').textContent = `${score}%`;
        document.getElementById('description').textContent = getVibe(score);
      } catch (err) {
        console.error("Fetch error:", err);
        document.getElementById('score').textContent = "--%";
        document.getElementById('description').textContent = "Failed to load";
      }
    });
  }
  
  function getVibe(score) {
    if (score > 90) return "Stunning skies!";
    if (score > 75) return "Gorgeous and glowing";
    if (score > 60) return "Pretty clear";
    if (score > 40) return "Some clouds";
    if (score > 20) return "Gloomy";
    return "Moody gray";
  }

  async function getSunTimeline(lat, lon) {
    try {
      const res = await fetch(`/api/suntimes?lat=${lat}&lon=${lon}`);
      const data = await res.json();
  
      if (!data || !data.sunrise) {
        console.error("Bad suntimes response:", data);
        return;
      }
  
      // Convert to local time for display
      const toLocal = (iso) => new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
  
      const timelineHTML = `
        <h2>Today’s Timeline</h2>
        <ul>
          <li>🌅 Sunrise: ${toLocal(data.sunrise)}</li>
          <li>🌇 Sunset: ${toLocal(data.sunset)}</li>
          <li>☀️ Solar Noon: ${toLocal(data.solar_noon)}</li>
          <li>🌓 First Light: ${toLocal(data.civil_twilight_begin)}</li>
          <li>🌃 Last Light: ${toLocal(data.civil_twilight_end)}</li>
        </ul>
      `;
  
      document.getElementById('timeline').innerHTML = timelineHTML;
  
    } catch (err) {
      console.error("Timeline fetch failed:", err);
    }
  }

  // Show/hide info tooltip
document.addEventListener("DOMContentLoaded", () => {
    const icon = document.getElementById("info-icon");
    const tooltip = document.getElementById("info-tooltip");
  
    icon.addEventListener("click", () => {
      tooltip.classList.toggle("hidden");
    });
  
    document.addEventListener("click", (e) => {
      if (!icon.contains(e.target) && !tooltip.contains(e.target)) {
        tooltip.classList.add("hidden");
      }
    });
  });