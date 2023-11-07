import mongoose from "mongoose";
import axios from "axios";
import dotenv from "dotenv";
import schedule from "node-schedule";
import qs from "qs"; // Query String

dotenv.config();

async function obtainAccessToken() {
  const params = {
    grant_type: "client_credentials",
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLE_SECRETE,
    scope: "api_offresdemploiv2 o2dsoffre",
  };

  try {
    const response = await axios.post(
      "https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire",
      qs.stringify(params),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("Error obtaining access token:", error);
    return null;
  }
}

obtainAccessToken()
  .then((token) => {
    if (token) {
      console.log("Obtained Access Token:", token);
      return token;
    } else {
      console.log("Failed to obtain the access token.");
    }
  })
  .catch((error) => {
    console.error("Error:", error.message);
  });

// Connection to MongoDB using async/await
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
const offreSchema = new mongoose.Schema(
  {
    data: {}, // This will store the entire offer object
  },
  { strict: false }
); // Disable strict mode to accept fields not defined in the schema

const OffreEmploi = mongoose.model("Offres", offreSchema);

// Fonction pour récupérer et enregistrer les données d'une liste de villes
const cities = [
  "63113",
  "69123",
  "25056",
  "21231",
  "35238",
  "45234",
  "2A004",
  "2B033",
  "51108",
  "57463",
  "67482",
  "80021",
  "59350",
  "75056",
  "14118",
  "76540",
  "33063",
  "87085",
  "86194",
  "34172",
  "31555",
  "13055",
  "44109",
  "97105",
  "97209",
  "97302",
  "97411",
  "97611",
];

// Function to delete job offers older than 14 days
const deleteOldOffers = async () => {
  const fourteenDaysAgo = new Date(
    new Date().setDate(new Date().getDate() - 14)
  );
  try {
    const result = await OffreEmploi.deleteMany({
      "data.dateCreation": { $lt: fourteenDaysAgo.toISOString() },
    });
    console.log(`Old job offers deleted: ${result.deletedCount}`);
  } catch (error) {
    console.error("Error deleting old job offers:", error);
  }
};

const fetchAndSaveOffersByCity = async (city) => {
  try {
    const access_token = await obtainAccessToken();
    if (!access_token) {
      throw new Error("Failed to obtain access token.");
    }

    let hasMore = true;
    let page = 1;

    while (hasMore) {
      const response = await axios.get(
        `https://api.pole-emploi.io/partenaire/offresdemploi/v2/offres/search?commune=${encodeURIComponent(
          city
        )}&range=${(page - 1) * 100}-${page * 100 - 1}&publieeDepuis=7`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      // Handle both 200 OK and 206 Partial Content status codes
      if (![200, 206].includes(response.status)) {
        throw new Error(
          `API request failed with status code: ${response.status}`
        );
      }

      console.log("Response Data:", response.data); // To inspect the structure

      const offres = response.data.resultats || [];
      console.log("Offres:", offres); // To inspect the offers

      for (const offerData of offres) {
        const offre = new OffreEmploi({ data: offerData });
        await offre.save();
        console.log("Saved offer:", offerData.id);
      }

      // If the number of offers is less than 100, or the status code is 200, there are no more pages
      if (offres.length < 100 || response.status === 200) {
        hasMore = false;
      } else {
        // Increase the page number for the next iteration
        page++;
      }
    }
  } catch (error) {
    if (error.response) {
      // Axios error with response (e.g., status code not in the 200 range)
      console.error(
        `API Error: ${error.response.status} - ${error.response.statusText}`
      );
    } else if (error.request) {
      // Axios error with request (no response received)
      console.error(`API Error: No response received - ${error.request}`);
    } else {
      // Non-Axios error (or not related to the HTTP request)
      console.error(`Error: ${error.message}`);
    }
  }
  // Call the delete function after saving the latest offers
  await deleteOldOffers();
};

// Parcourir chaque ville et récupérer ses offres
const fetchAndSaveOffersForTopCities = async () => {
  for (const city of cities) {
    await fetchAndSaveOffersByCity(city);
  }
};

/*
// Planifier la récupération des offres à 11h et 18h chaque jour
schedule.scheduleJob({ hour: 11, minute: 0 }, async () => {
  console.log("Lancement de la tâche planifiée à 11h.");
  fetchAndSaveOffersForTopCities();
});

schedule.scheduleJob({ hour: 18, minute: 0 }, async () => {
  console.log("Lancement de la tâche planifiée à 18h.");
  fetchAndSaveOffersForTopCities();
});
*/
const startFetching = async () => {
  console.log("Starting to fetch and save offers for top cities.");
  await fetchAndSaveOffersForTopCities();
  console.log("Completed fetching and saving offers.");
};

startFetching();
