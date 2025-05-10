export default async function handler(req, res) {
  const { lat, lon } = req.query;

  const apiKey = process.env.OPENWEATHER_API_KEY;

  console.log("Using API Key:", apiKey); // TEMPORARY for debugging

  if (!lat || !lon || !apiKey) {
    return res.status(400).json({ error: "Missing parameters or API key" });
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
}