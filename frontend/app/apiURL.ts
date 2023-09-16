let apiURL = "";

if (process.env.NODE_ENV === "development") {
  apiURL = "http://localhost:8000";
} else {
  apiURL = "";
}

export default apiURL;
