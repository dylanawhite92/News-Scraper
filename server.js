//Dependencies
var express = require("express");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var logger = require("morgan");
// Axios & Cheerio make scraping possible
var axios = require("axios");
var cheerio = require("cheerio");

// Initialize express
var app = express();

// Database configuration
var databaseUrl = "mongoHeadlines";
var collections = ["scrapedData"];

app.get("/", function(req, res) {
    
})


var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);