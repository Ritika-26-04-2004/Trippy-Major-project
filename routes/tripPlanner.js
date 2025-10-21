require('dotenv').config();
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const Place = require('../models/place');

// ✅ Initialize Gemini & API Keys
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.API_KEY);
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const WEATHER_KEY = process.env.WEATHER_API_KEY;

/* -----------------------------------------------------------
   🔹 Helper: Fetch a photo URL (Unsplash → fallback Wikipedia)
------------------------------------------------------------ */
async function getPhotoUrl(query) {
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${UNSPLASH_KEY}`;
    const res = await axios.get(url);
    if (res.data.results.length > 0) return res.data.results[0].urls.small;
  } catch (err) {
    console.error("Unsplash error:", err.message);
  }

  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const wikiRes = await axios.get(wikiUrl);
    if (wikiRes.data.thumbnail?.source) return wikiRes.data.thumbnail.source;
  } catch (err) {
    console.error("Wikipedia error:", err.message);
  }

  return null;
}

/* -----------------------------------------------------------
   🔹 Helper: Fetch Weather Data (OpenWeatherMap)
------------------------------------------------------------ */
async function getWeather(city) {
  if (!city || city.trim() === "" || /escape|park|unknown|adventure|getaway|relax/i.test(city)) {
    console.warn(`⚠️ Skipping invalid or unknown city: ${city}`);
    return {
      city: city || "Unknown",
      forecast: [
        { date: "N/A", temp: "--", desc: "Weather unavailable", icon: "01d", humidity: 0, wind: 0, hourly: [] }
      ]
    };
  }

  try {
    console.log(`🌦️ Fetching weather for city: ${city}`);
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${WEATHER_KEY}`;
    const res = await axios.get(url);
    const list = res.data.list;
    const grouped = {};

    // Group by date
    list.forEach(item => {
      const date = item.dt_txt.split(" ")[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    // Create 5-day summary
    const forecast = Object.keys(grouped).slice(0, 5).map((date, idx) => {
      const dayData = grouped[date];
      const temps = dayData.map(d => d.main.temp);
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      const main = dayData[Math.floor(dayData.length / 2)].weather[0];
      const humidity = Math.round(dayData.reduce((a, b) => a + b.main.humidity, 0) / dayData.length);
      const wind = Math.round(dayData.reduce((a, b) => a + b.wind.speed, 0) / dayData.length);

      return {
        date,
        temp: avgTemp.toFixed(1),
        desc: main.description,
        icon: main.icon,
        humidity,
        wind,
        hourly: idx === 0
          ? dayData.slice(0, 8).map(h => ({
              time: new Date(h.dt_txt).toLocaleTimeString([], { hour: 'numeric' }),
              temp: h.main.temp.toFixed(1),
              icon: h.weather[0].icon,
              desc: h.weather[0].description
            }))
          : []
      };
    });

    return { city, forecast };
  } catch (err) {
    console.error("❌ Weather API error:", err.response?.data || err.message);
    return {
      city,
      forecast: [
        { date: "N/A", temp: "--", desc: "Unable to fetch weather data", icon: "01d", humidity: 0, wind: 0, hourly: [] }
      ]
    };
  }
}

/* -----------------------------------------------------------
   🔹 Route: Trip Planner Page (/ai)
------------------------------------------------------------ */
router.get('/', (req, res) => {
  res.render('trip-planner.ejs');
});

/* -----------------------------------------------------------
   🔹 Route: Generate Trip Plan (/ai/generate-trip)
------------------------------------------------------------ */
router.post('/generate-trip', async (req, res) => {
  const { destination, budget, days, category } = req.body;

  try {
    const place = await Place.findOne({ name: new RegExp(`^${destination}$`, 'i') });

    if (!place) {
      req.flash('error', `Sorry, we don't have data for "${destination}". Please try another place.`);
      return res.redirect('/ai');
    }

    // ✅ Always use the DB name for weather
    const cleanCity = place.name.split(',')[0].trim();
    console.log(`🌦️ Cleaned city for weather: ${cleanCity}`);
    const weatherData = await getWeather(cleanCity);

    // 🧠 Gemini prompt
    const prompt = `Plan a ${days}-day ${category} trip to ${place.name}, ${place.country} with a ${budget} budget.
The 5-day weather forecast is: ${JSON.stringify(weatherData.forecast)}.
Return ONLY valid JSON (no explanations). Format:
{
  "tripName": "Trip to ${place.name}",
  "overview": "A short overview of the trip.",
  "weatherSummary": "Brief weather overview (1-2 lines).",
  "days": [
    {
      "dayNumber": 1,
      "theme": "Day theme",
      "activities": [
        { "name": "Activity", "description": "Short desc" }
      ],
      "foodSuggestions": [
        { "name": "Food/Restaurant", "description": "Short desc" }
      ],
      "hotelSuggestion": {
        "name": "Hotel Name",
        "description": "Short desc"
      }
    }
  ]
}`;

    // Generate content
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    let geminiResponseText = result.response.text().trim();

    // Safely extract JSON
    const jsonStart = geminiResponseText.indexOf("{");
    const jsonEnd = geminiResponseText.lastIndexOf("}");
    geminiResponseText = geminiResponseText.substring(jsonStart, jsonEnd + 1);

    let itineraryData;
    try {
      itineraryData = JSON.parse(geminiResponseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON:", parseError);
      console.error("Raw response:", geminiResponseText);
      req.flash('error', 'Gemini returned invalid JSON. Please try again.');
      return res.redirect('/ai');
    }

    // Add photos
    for (const day of itineraryData.days) {
      for (const act of day.activities) act.photo = await getPhotoUrl(`${act.name} ${place.name}`);
      for (const food of day.foodSuggestions) food.photo = await getPhotoUrl(`${food.name} ${place.name}`);
      if (day.hotelSuggestion?.name) day.hotelSuggestion.photo = await getPhotoUrl(`${day.hotelSuggestion.name} ${place.name}`);
    }

    res.render('trip-result', { place, itineraryData, weatherData });

  } catch (err) {
    console.error("Trip generation error:", err);
    req.flash('error', 'Failed to generate trip plan. Please try again.');
    res.redirect('/ai');
  }
});

/* -----------------------------------------------------------
   🔹 Weather API Endpoint (/ai/weather)
------------------------------------------------------------ */
router.get('/weather', async (req, res) => {
  const { city } = req.query;
  const cleanCity = city?.split(',')[0]?.trim();
  const data = await getWeather(cleanCity);
  res.json({ forecast: data.forecast });
});

module.exports = router;
