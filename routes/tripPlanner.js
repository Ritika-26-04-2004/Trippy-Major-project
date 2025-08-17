require('dotenv').config();

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Place = require('../models/place');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.API_KEY);
router.get('/', (req, res) => {
  res.render('trip-planner.ejs');  // Replace 'tripForm' with your form's EJS filename
});

router.post('/generate-trip', async (req, res) => {
  const { destination, budget, days, category } = req.body;

  try {
    // Find place from DB by name (case-insensitive)
    const place = await Place.findOne({ name: new RegExp(`^${destination}$`, 'i') });

    if (!place) {
      req.flash('error', `Sorry, we don't have data for "${destination}". Please try another place.`);
      return res.redirect('/');
    }

    // Build prompt with info from DB (you can customize this)
    const prompt = `Plan a ${days}-day ${category} trip to ${place.name}, ${place.country} with a ${budget} budget.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);

    res.render('trip-result', {
      place,
      itinerary: result.response.text()
    });

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to generate trip plan. Please try again.');
    res.redirect('/');
  }
});

module.exports = router;

