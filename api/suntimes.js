export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing latitude or longitude" });
  }

  try {
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.status !== "OK") {
      return res.status(500).json({ error: "Failed to fetch sun times" });
    }

    res.status(200).json(data.results);
  } catch (error) {
    console.error("Sun API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}