import axios from "axios";
import dotenv from "dotenv";
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
    } else {
      console.log("Failed to obtain the access token.");
    }
  })
  .catch((error) => {
    console.error("Error:", error.message);
  });
