//Dependencies
var express = require("express");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var logger = require("morgan");
// Axios & Cheerio make scraping possible
var axios = require("axios");
var cheerio = require("cheerio");
// Require models
var db = require("./models");

// Initialize express
var app = express();

// Set host port
var PORT = 3000;

// Configure middleware

// Set Handlebars as the default templating engine.
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// use morgan for logging requests
app.use(logger("dev"));
// Parse request as JSON
app.use(express.urlencoded({ extended : true}));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// If deployed on Heroku, use the remote database, otherwise use the local database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes

// Home route
app.get("/", function(req, res) {
    db.Article.find({"saved": false}, function(error, data) {
        var hbsObject = {
            articles: data
        };
        res.render("home", hbsObject);
    });
});

// Route for articles handlebars
app.get("/saved", function(req, res) {
    db.Article.find({"saved": true})
    .populate("notes").then(function(req, res) {
        var hbsObject = {
            articles: articles
        };
        res.render("articles", hbsObject);
    }).catch(function(err) {
        res.json(err);
    });
});

// GET route for scraping New York Times
app.get("/scrape", function(req, res) {
    axios.get("https://www.nytimes.com/")
    .then(function(response) {
        // Load response into cheerio, save it to $ for shorthand
        var $ = cheerio.load(response.data);

        // Grab every element with an article tag
        $("article h2").each(function(i, element) {
            // Save empty result object
            var result = {};

            // Save text, href, summary, and thumbnail src as properties
            result.title = $(this).text();
            result.link = $(this).parent("div").parent("a").attr("href");
            result.summary = $(this).parent("div").next("p").text();

            // if (result.summary === '') {
            //     result.summary = "No summary was given for this article! :(";
            // }

            // Create a new Article using the result
            db.Article.create(result)
            .then(function(dbArticle) {
                // View the result in the console
                console.log(dbArticle);
            }).catch(function(err) {
                // Log error if it occurs
                console.log(err);
            });
        });

        // Send message to client
        res.send("Scrape Complete!")
    });
});

// Route for getting all Articles from the db
app.get("/saved", function(req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
      .then(function(dbArticle) {
        console.log(dbArticle);
        res.render("saved", {
          saved: dbArticle
        });
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  
  // Route for creating an Article in the db
  app.post("/api/saved", function(req, res) {
    db.Article.create(req.body)
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  
  // Route for grabbing a specific Article by id, populate it with it's note
  app.get("/articles/:id", function(req, res) {
    console.log(req.params.id);
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
      // ..and populate all of the notes associated with it
      .populate("note")
      .then(function(dbArticle) {
        // If we were able to successfully find an Article with the given id, send it back to the client
        console.log(dbArticle);
        if (dbArticle) {
        res.render("articles", {
          data: dbArticle
        });
      }
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  
  //Route for deleting an article from the db
  app.delete("/saved/:id", function(req, res) {
    db.Article.deleteOne({ _id: req.params.id })
    .then(function(removed) {
      res.json(removed);
    }).catch(function(err,removed) {
        // If an error occurred, send it to the client
          res.json(err);
      });
  });
  
  //Route for deleting a note
  app.delete("/articles/:id", function(req, res) {
    db.Note.deleteOne({ _id: req.params.id })
    .then(function(removed) {
      res.json(removed);
    }).catch(function(err,removed) {
        // If an error occurred, send it to the client
          res.json(err);
      });
  });
  
  // Route for saving/updating an Article's associated Note
  app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
      .then(function(dbNote) {
        db.Article.findOneAndUpdate({ _id: req.params.id }, {$push: { note: dbNote._id }}, { new: true })
        .then(function(dbArticle) {
          console.log(dbArticle);
          res.json(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          res.json(err);
        });
      })
      .catch(function(err) {
        res.json(err);
      })
  });

// Start the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
  });