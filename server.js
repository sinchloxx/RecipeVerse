const express = require("express");
const app = express();

app.use(express.json());

// HOME ROUTE (fixes 404)
app.get("/", (req, res) => {
  res.send("🍳 RecipeVerse is live!");
});

// TEST ROUTE
app.get("/api", (req, res) => {
  res.json({ message: "API working 🚀" });
});

// IMPORTANT for Vercel
module.exports = app;
