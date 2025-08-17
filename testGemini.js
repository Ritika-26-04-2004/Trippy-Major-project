const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log("Current directory:", __dirname);
console.log("Looking for .env here:", path.resolve(__dirname, '.env'));
console.log("Gemini API Key in env:", process.env.GEMINI_API_KEY);
