require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

const {
  API_CITY,
  API_KEY,
  API_LANGUE,
  API_UNITS,
  CURRENT_BASE_URL,
  FORECAST_BASE_URL,
  PORT = 3000,
} = process.env;

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const defaultCity = API_CITY && API_CITY.trim() ? API_CITY.trim() : 'saint-jean-de-matha,ca';
let selectedCity = defaultCity;
let selectedDay = 'today';

const buildWeatherUrl = (baseUrl, city) => {
  const params = new URLSearchParams({ q: city });
  if (API_LANGUE) params.append('lang', API_LANGUE);
  if (API_UNITS) params.append('units', API_UNITS);
  if (API_KEY) params.append('appid', API_KEY);
  return `${baseUrl}?${params.toString()}`;
};

const fetchJSON = async (url) => {
  const response = await fetch(url);
  return response.json();
};

const isSuccess = (payload) => Number(payload?.cod) === 200;
const viewModel = (page, data = []) => ({
  page,
  data,
  day: selectedDay,
  city: selectedCity,
});

app.get('/', async (req, res) => {
  try {
    const urls = [
      buildWeatherUrl(CURRENT_BASE_URL, selectedCity),
      buildWeatherUrl(FORECAST_BASE_URL, selectedCity),
    ];
    const responses = await Promise.all(urls.map(fetchJSON));
    const shouldRenderHome = responses.every(isSuccess);

    if (shouldRenderHome) {
      res.render('meteo', viewModel('home', responses));
      return;
    }

    res.render('error', viewModel('error', responses));
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    res.render('error', viewModel('error'));
  }
});

app.get('/location', (req, res) => {
  res.render('location', viewModel('location'));
});

app.post('/', (req, res) => {
  const { button, city } = req.body;
  if (button) {
    selectedDay = button;
  }

  if (city && city.trim()) {
    selectedCity = city.trim();
  }

  res.redirect('/');
});

const port = Number(PORT) || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});
