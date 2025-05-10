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

  const cacheKey = `weather_${lat}_${lon}`;
  if (isDev && cache[cacheKey] && Date.now() - cache[cacheKey].ts < 5 * 60 * 1000) {
    return res.status(200).json(cache[cacheKey].data);
  }

  const fallbackSunTimes = {
    sunrise: Math.floor(new Date().setHours(6, 0, 0) / 1000),
    sunset: Math.floor(new Date().setHours(18, 0, 0) / 1000)
  };

  // 🔷 1. Tomorrow.io
  try {
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${tomorrowKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && data?.data?.values) {
      const values = data.data.values;
      const normalized = {
        clouds: { all: values.cloudCover },
        main: { humidity: values.humidity },
        visibility: values.visibility,
        sys: fallbackSunTimes
      };
      if (isDev) cache[cacheKey] = { ts: Date.now(), data: normalized };
      return res.status(200).json(normalized);
    }

    throw new Error("Tomorrow.io failed");
  } catch {
    console.warn("⚠️ Tomorrow.io failed. Trying OpenWeather...");
  }

  // 🔶 2. OpenWeather
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${openweatherKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && data?.main) {
      if (isDev) cache[cacheKey] = { ts: Date.now(), data };
      return res.status(200).json(data);
    }

    throw new Error("OpenWeather failed");
  } catch {
    console.warn("⚠️ OpenWeather failed. Trying WeatherAPI...");
  }

  // 🌤️ 3. WeatherAPI.com
  try {
    const url = `https://api.weatherapi.com/v1/current.json?key=${weatherapiKey}&q=${lat},${lon}`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && data?.current) {
      const normalized = {
        clouds: { all: data.current.cloud },
        main: { humidity: data.current.humidity },
        visibility: data.current.vis_km * 1000,
        sys: fallbackSunTimes
      };
      if (isDev) cache[cacheKey] = { ts: Date.now(), data: normalized };
      return res.status(200).json(normalized);
    }

    throw new Error("WeatherAPI failed");
  } catch {
    console.warn("⚠️ WeatherAPI failed. Trying Open-Meteo...");
  }

  // 🌍 4. Open-Meteo
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloudcover,humidity,visibility&timezone=UTC`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && data?.current) {
      const normalized = {
        clouds: { all: data.current.cloudcover },
        main: { humidity: data.current.humidity },
        visibility: data.current.visibility * 1000,
        sys: fallbackSunTimes
      };
      if (isDev) cache[cacheKey] = { ts: Date.now(), data: normalized };
      return res.status(200).json(normalized);
    }

    throw new Error("Open-Meteo failed");
  } catch (finalErr) {
    console.error("❌ All weather APIs failed:", finalErr);
    return res.status(500).json({ error: "Failed to fetch weather from all sources." });
  }
}