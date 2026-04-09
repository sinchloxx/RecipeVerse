const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("🍳 RecipeVerse is live!");
});

module.exports = app;
