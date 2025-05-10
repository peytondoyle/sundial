export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const apiKey = process.env.TOMORROW_API_KEY;

  if (!lat || !lon || !apiKey) {
    return res.status(400).json({ error: "Missing parameters or API key" });
  }

  const now = new Date().toISOString();
  const later = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const url = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&fields=temperature,humidity,cloudCover,visibility&timesteps=1h&units=metric&startTime=${now}&endTime=${later}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data?.data?.timelines?.[0]?.intervals) {
      return res.status(500).json({ error: "Missing forecast data" });
    }

    res.status(200).json(data.data.timelines[0].intervals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch forecast" });
  }
}