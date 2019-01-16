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

// Route for grabbing all articles in db
app.get("/articles", function(req, res) {
    db.Article.find({})
    .then(function(dbArticle) {
        res.send(dbArticle);
    })
    .catch(function(err) {
        res.json(err);
    });
});

// Route for grabbing specific article by id, with note attached
app.get("/articles/:id", function(req, res) {
    db.Article.findOne({_id: req.params.id})
    .populate("note")
    .then(function(dbArticle) {
        res.send(dbArticle);
    }).catch(function(err) {
        res.json(err);
    });
});

// Route for saving/updating an article
app.post("/articles/save/:id", function(req, res) {
    db.Article.findOneAndUpdate({ "_id": req.params.id }, {saved: true})
    .then(function(dbArticle) {
        res.send(dbArticle);
    }).catch(function(err) {
        res.json(err);
    })
})

// Route for deleting an article
app.post("/articles/delete/:id", function(req, res) {
    db.Article.findOneAndDelete({_id: req.params.id}, {"saved": false, "notes": []})
    .then(function(dbArticle) {
        res.send(dbArticle);
    }).catch(function(err) {
        res.json(err);
    })
});

// Route for saving notes
app.post("/notes/save/:id", function(req, res) {
    var newNote = new Note({
        body: req.body.text,
        title: req.params.id
    });

    newNote.create(function(err, note) {
        if (err) {
            res.json(err);
        }
        else {
            db.Article.findOneAndUpdate({"_id": req.params.id}, {$push: {"notes": note}})
            .then(function(note) {
                res.send(note)
            }).catch(function(err) {
                res.json(err);
            })
        };
    });
});

// Route for deleting notes
app.delete("/notes/delete/:note_id/:article_id", function(req, res) {
    db.Note.findOneAndDelete({"_id": req.params.note_id}, function(req, res) {
        if (err) {
            res.json(err)
        }
        else {
            
        }
    })
});

// Start the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
  });