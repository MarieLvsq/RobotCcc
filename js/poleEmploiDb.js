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
const offreEmploiSchema = new mongoose.Schema(
  {
    data: {}, // This will store the entire offer object
  },
  { strict: false }
); // Disable strict mode to accept fields not defined in the schema

/*
const offreEmploiSchema = new mongoose.Schema({
  id: String,
  intitule: String,
  description: String,
  dateCreation: Date,
  dateActualisation: Date,
  lieuTravail: {
    libelle: String,
    latitude: Number,
    longitude: Number,
    codepostal: String,
    commune: String, // INSEE code
  },
  typeContratLibelle: String,
  salaireLibelle: String,
  urlOrigine: String,
  secteurActiviteLibelle: String,
});*/

const OffreEmploi = mongoose.model("OffreEmploi", offreEmploiSchema);

// Fonction pour récupérer et enregistrer les données d'une liste de villes
const city = "28085";

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
        )}&range=${(page - 1) * 100}-${page * 100 - 1}`,
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
};

// Parcourir chaque ville et récupérer ses offres
const fetchAndSaveOffersForTopCities = async () => {
  //for (const city of cities) {
  await fetchAndSaveOffersByCity(city);
  // }
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
