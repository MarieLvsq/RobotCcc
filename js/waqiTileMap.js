import mongoose from "mongoose";
import axios from "axios";
import dotenv from "dotenv";
import schedule from "node-schedule";
import qs from "qs"; // Query String

dotenv.config();

const WAQI_API_KEY = process.env.WAQI_API_KEY;

mongoose
  .connect(process.env.DB_CONNECTION_STRING, {
    user: process.env.DB_USER,
    pass: process.env.DB_PSSWD,
    authSource: "admin",
  })
  .then(() => {
    console.log("Connected to MongoDB.");
    fetchAndStoreAirQualityDataForCities();
  })
  .catch((err) => {
    console.error("Connection error", err);
  });

// Modèle Mongoose pour la carte world air quality index
const waqiTileMapSchema = new mongoose.Schema({
  idx: Number,
  aqi: Number,
  time: {
    s: String,
    tz: String,
    v: Number,
    iso: String,
  },
  city: {
    geo: [Number], // Latitude and Longitude
    name: String,
    url: String,
  },
  dominentpol: String,
  iaqi: {
    co: { v: Number },
    h: { v: Number },
    no2: { v: Number },
    o3: { v: Number },
    p: { v: Number },
    pm10: { v: Number },
    pm25: { v: Number },
    so2: { v: Number },
    t: { v: Number },
    w: { v: Number },
  },
  attributions: [
    {
      url: String,
      name: String,
    },
  ],
  forecast: {
    daily: {
      o3: [
        {
          avg: Number,
          day: String,
          max: Number,
          min: Number,
        },
      ],
      pm10: [
        {
          avg: Number,
          day: String,
          max: Number,
          min: Number,
        },
      ],
      pm25: [
        {
          avg: Number,
          day: String,
          max: Number,
          min: Number,
        },
      ],
      uvi: [
        {
          avg: Number,
          day: String,
          max: Number,
          min: Number,
        },
      ],
      // Add more pollutants as needed
    },
  },
  debug: {
    sync: String,
  },
});

const WaqiTileMap = mongoose.model("WaqiTileMap", waqiTileMapSchema);
const cities = [
  "Paris",
  "Lyon",
  "Marseille",
  "Toulouse",
  "Nice",
  "Nantes",
  "Montpellier",
  "Strasbourg",
  "Bordeaux",
  "Lille",
  "Rennes",
  "Reims",
  "Toulon",
  "Saint-Étienne",
  "Le Havre",
  "Dijon",
  "Grenoble",
  "Angers",
  "Villeurbanne",
  "Saint-Denis",
  "Nîmes",
  "Clermont-Ferrand",
  "Aix-en-Provence",
  "Le Mans",
  "Brest",
  "Tours",
  "Amiens",
  "Annecy",
  "Limoges",
  "Boulogne-Billancourt",
  "Metz",
  "Besançon",
  "Perpignan",
  "Orléans",
  "Rouen",
  "Saint-Denis",
  "Montreuil",
  "Argenteuil",
  "Mulhouse",
  "Caen",
  "Nancy",
  "Saint-Paul",
  "Tourcoing",
  "Roubaix",
  "Nanterre",
  "Vitry-sur-Seine",
  "Nouméa",
  "Créteil",
  "Avignon",
  "Poitiers",
  "Aubervilliers",
  "Asnières-sur-Seine",
  "Colombes",
  "Dunkerque",
  "Aulnay-sous-Bois",
  "Saint-Pierre",
  "Versailles",
  "Courbevoie",
  "Le Tampon",
  "Béziers",
  "Rueil-Malmaison",
  "Cherbourg-en-Cotentin",
  "Champigny-sur-Marne",
  "La Rochelle",
  "Pau",
  "Fort-de-France",
  "Antibes",
  "Saint-Maur-des-Fossés",
  "Mérignac",
  "Ajaccio",
  "Cannes",
  "Saint-Nazaire",
  "Mamoudzou",
  "Drancy",
  "Noisy-le-Grand",
  "Colmar",
  "Issy-les-Moulineaux",
  "Cergy",
  "Calais",
  "Levallois-Perret",
  "Vénissieux",
  "Évry-Courcouronnes",
  "Cayenne",
  "Pessac",
  "Valence",
  "Bourges",
  "Ivry-sur-Seine",
  "Quimper",
  "Clichy",
  "Antony",
  "Troyes",
  "La Seyne-sur-Mer",
  "Montauban",
  "Villeneuve-d'Ascq",
  "Pantin",
  "Neuilly-sur-Seine",
  "Chambéry",
  "Niort",
  "Sarcelles",
  "Le Blanc-Mesnil",
  "Maisons-Alfort",
  "Lorient",
];
async function fetchAndStoreAirQualityData(cityName) {
  try {
    const airQualityEndpoint = `https://api.waqi.info/feed/${cityName}/?token=${WAQI_API_KEY}`;
    const airQualityResponse = await axios.get(airQualityEndpoint);
    const airQualityData = airQualityResponse.data;

    if (airQualityData.status === "ok") {
      const newData = {
        idx: airQualityData.data.idx,
        aqi: airQualityData.data.aqi,
        time: airQualityData.data.time,
        city: airQualityData.data.city,
        attributions: airQualityData.data.attributions,
        iaqi: airQualityData.data.iaqi,
        forecast: airQualityData.data.forecast,
      };

      // Store in MongoDB
      await WaqiTileMap.create(newData);
      console.log(`Air quality data for ${cityName} stored in MongoDB.`);
    } else {
      console.log(`Error fetching air quality data for ${cityName}.`);
    }
  } catch (error) {
    console.error(`Error fetching data for ${cityName}:`, error);
  }
}

async function fetchAndStoreAirQualityDataForCities() {
  for (const cityName of cities) {
    await fetchAndStoreAirQualityData(cityName);
  }
}
