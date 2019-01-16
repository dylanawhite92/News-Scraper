var mongoose = require("mongoose");

// Save a reference to the Schema constructor
var Schema = mongoose.Schema;

// Using the Schema constructor, create a new NoteSchema object
var NoteSchema = new Schema({
    title: String,
    body: String
})

// Create our model of the schema above using mongoose's method
var Note = mongoose.model("Note", NoteSchema);

module.exports = Note;