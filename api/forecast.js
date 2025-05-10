let cache = {};

export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const tomorrowKey = process.env.TOMORROW_API_KEY;
  const openweatherKey = process.env.OPENWEATHER_API_KEY;
  const weatherapiKey = process.env.WEATHERAPI_KEY;
  const isDev = process.env.NODE_ENV !== "production";

  if (!lat || !lon || !tomorrowKey || !openweatherKey || !weatherapiKey) {
    return res.status(400).json({ error: "Missing coordinates or API keys" });
  }

  const cacheKey = `forecast_${lat}_${lon}`;
  if (isDev && cache[cacheKey] && Date.now() - cache[cacheKey].ts < 15 * 60 * 1000) {
    return res.status(200).json(cache[cacheKey].data);
  }

  const nowISO = new Date().toISOString();
  const laterISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // 🔷 1. Tomorrow.io
  try {
    const url = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&fields=cloudCover,humidity,visibility&timesteps=1h&units=metric&startTime=${nowISO}&endTime=${laterISO}&apikey=${tomorrowKey}`;
    const res1 = await fetch(url);
    const json1 = await res1.json();

    if (res1.ok && json1?.data?.timelines?.[0]?.intervals) {
      const result = json1.data.timelines[0].intervals;
      if (isDev) cache[cacheKey] = { ts: Date.now(), data: result };
      return res.status(200).json(result);
    }
    throw new Error("Tomorrow.io failed");
  } catch {
    console.warn("⚠️ Tomorrow.io failed. Trying OpenWeather...");
  }

  // 🔶 2. OpenWeather
  try {
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts,current&units=metric&appid=${openweatherKey}`;
    const res2 = await fetch(url);
    const json2 = await res2.json();

    if (res2.ok && json2?.hourly) {
      const result = json2.hourly.slice(0, 24).map((h) => ({
        startTime: new Date(h.dt * 1000).toISOString(),
        values: {
          cloudCover: h.clouds,
          humidity: h.humidity,
          visibility: h.visibility ?? 10000
        }
      }));
      if (isDev) cache[cacheKey] = { ts: Date.now(), data: result };
      return res.status(200).json(result);
    }
    throw new Error("OpenWeather failed");
  } catch {
    console.warn("⚠️ OpenWeather failed. Trying WeatherAPI...");
  }

  // 🌤️ 3. WeatherAPI.com
  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${weatherapiKey}&q=${lat},${lon}&hours=24`;
    const res3 = await fetch(url);
    const json3 = await res3.json();

    if (res3.ok && json3?.forecast?.forecastday?.[0]?.hour) {
      const result = json3.forecast.forecastday[0].hour.map((h) => ({
        startTime: h.time.replace(" ", "T") + ":00Z",
        values: {
          cloudCover: h.cloud ?? 0,
          humidity: h.humidity,
          visibility: (h.vis_km ?? 10) * 1000
        }
      }));
      if (isDev) cache[cacheKey] = { ts: Date.now(), data: result };
      return res.status(200).json(result);
    }
    throw new Error("WeatherAPI failed");
  } catch {
    console.warn("⚠️ WeatherAPI failed. Trying Open-Meteo...");
  }

  // 🌍 4. Open-Meteo
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloudcover,humidity,visibility&forecast_days=1&timezone=UTC`;
    const res4 = await fetch(url);
    const json4 = await res4.json();

    if (
      res4.ok &&
      json4?.hourly?.time &&
      json4.hourly.cloudcover &&
      json4.hourly.humidity &&
      json4.hourly.visibility
    ) {
      const result = json4.hourly.time.map((time, i) => ({
        startTime: time + ":00Z",
        values: {
          cloudCover: json4.hourly.cloudcover[i],
          humidity: json4.hourly.humidity[i],
          visibility: json4.hourly.visibility[i] * 1000
        }
      }));
      if (isDev) cache[cacheKey] = { ts: Date.now(), data: result };
      return res.status(200).json(result);
    }

    throw new Error("Open-Meteo failed");
  } catch (err) {
    console.error("❌ All APIs failed:", err);
    return res.status(500).json({ error: "Failed to fetch forecast from any source." });
  }
}