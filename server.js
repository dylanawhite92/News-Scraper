//Dependencies
var express = require("express");
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
var PORT = process.env.PORT || 3000;

// Configure middleware

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
    res.send("index.html");
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
            if (!result.summary) {
                result.summary = "Oops! They didn't provide us with a summary of that article. :("
            };
            result.source = "New York Times";

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
app.get("/articles", function(req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
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
    db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function(dbArticle) {
        res.json(dbArticle);
    }).catch(function(err) {
        res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
    db.Note.create(req.body)
    .then(function(dbNote) {
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    }).then(function(dbArticle) {
        res.json(dbArticle);
    }).catch(function(err) {
        res.json(err);
    });
});
  
//Route for deleting an article from the db
app.delete("/delete/:id", function(req, res) {
    db.Article.deleteOne({ _id: req.params.id })
    .then(function(dbArticle) {
      res.json(dbArticle);
    }).catch(function(err) {
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
  
// Route for saving/updating an Article's Note
app.post("/articles/:id", function(req, res) {
    db.Note.create(req.body).then(function(dbNote) {
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    }).then(function(dbArticle) {
        res.json(dbArticle);
    })
    .catch(function(err) {
        res.json(err);
    });
});

// Route for saving/updating article to be saved
app.put("/saved/:id", function(req, res) {
    db.Article.findByIdAndUpdate({ _id: req.params.id }, { $set: { isSaved: true }})
    .then(function(dbArticle) {
        res.json(dbArticle);
    })
    .catch(function(err) {
        res.json(err);
    });
});
  
// Route for getting saved article
app.get("/saved", function(req, res) {
    db.Article.find({ isSaved: true })
    .then(function(dbArticle) {
        res.json(dbArticle);
    })
    .catch(function(err) {
        res.json(err);
    });
});
  
// Route for deleting/updating saved article
app.put("/delete/:id", function(req, res) {
    db.Article.findByIdAndUpdate({ _id: req.params.id }, { $set: { isSaved: false }})
    .then(function(dbArticle) {
        res.json(dbArticle);
    }).catch(function(err) {
        res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
  });