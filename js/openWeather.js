import mongoose from "mongoose";
import axios from "axios";
import dotenv from "dotenv";
import schedule from "node-schedule";
import qs from "qs"; // Query String

dotenv.config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

mongoose
  .connect(process.env.DB_CONNECTION_STRING, {
    user: process.env.DB_USER,
    pass: process.env.DB_PSSWD,
    authSource: "admin",
  })
  .then(() => {
    console.log("Connected to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
  });

// Modèle Mongoose pour une offre d'emploi
const AirQualitySchema = new mongoose.Schema(
  {
    city: String,
    aqi: Number,
    co: Number,
    no: Number,
    no2: Number,
    o3: Number,
    so2: Number,
    pm2_5: Number,
    pm10: Number,
    nh3: Number,
    date: Date,
  },
  { timestamps: true }
);

const AirQuality = mongoose.model("AirQuality", AirQualitySchema);

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

async function getLocationData(cityName) {
  try {
    // Convert city name to latitude and longitude using OpenWeatherMap's Geocoding API
    const geoEndpoint = `http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${OPENWEATHER_API_KEY}`;
    const geoResponse = await axios.get(geoEndpoint);

    if (geoResponse.data.length === 0) {
      console.log("Location not found for city:", cityName);
      return;
    }

    const { lat, lon } = geoResponse.data[0];

    // Fetch air pollution data based on lat & lon
    await fetchAndSaveAirQualityData({ name: cityName, lat, lon });
  } catch (error) {
    console.error("Error fetching location data for city:", cityName, error);
  }
}

const fetchAndSaveAirQualityData = async ({ name, lat, lon }) => {
  try {
    const response = await axios.get(
      "http://api.openweathermap.org/data/2.5/air_pollution",
      {
        params: {
          lat: lat,
          lon: lon,
          appid: OPENWEATHER_API_KEY,
        },
      }
    );

    const { data } = response;
    if (data && data.list && data.list.length > 0) {
      const { main, components } = data.list[0];
      const updateData = {
        // This object contains the data to update
        city: name,
        aqi: main.aqi,
        co: components.co,
        no: components.no,
        no2: components.no2,
        o3: components.o3,
        so2: components.so2,
        pm2_5: components.pm2_5,
        pm10: components.pm10,
        nh3: components.nh3,
        date: new Date(data.list[0].dt * 1000),
      };

      // Update existing document or create a new one if it doesn't exist
      await AirQuality.findOneAndUpdate({ city: name }, updateData, {
        new: true,
        upsert: true,
      });
      console.log(`Air quality data for ${name} updated or created.`);
    }
  } catch (error) {
    console.error(`Error fetching air quality data for ${name}: `, error);
  }
};

/*// Schedule tasks to run at 11am and 6pm
schedule.scheduleJob("0 11,18 * * *", () => {
  console.log("Running scheduled task to fetch air quality data");
  cities.forEach(getLocationData);
  cities.forEach(fetchAndSaveAirQualityData);
});
*/

// Function to fetch and save data for all cities
async function fetchAndSaveDataForAllCities() {
  for (const cityName of cities) {
    await getLocationData(cityName);
  }
}

// Call the function to execute the data fetching process immediately
fetchAndSaveDataForAllCities()
  .then(() => {
    console.log("All cities have been processed.");
  })
  .catch((error) => {
    console.error("An error occurred while processing the cities:", error);
  });
