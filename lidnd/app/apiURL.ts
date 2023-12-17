let apiURL = "";

if (process.env.NODE_ENV === "development") {
  apiURL = "http://localhost:8000";
} else {
  apiURL = "https://lidnd-bot-production.up.railway.app";
}

export default apiURL;
