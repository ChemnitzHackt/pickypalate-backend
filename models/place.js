var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var PlaceSchema   = new Schema({
  id: Number,
  tags: Object,
  lat: Number,
  lon: Number,
  type: String,
});

module.exports = mongoose.model('Place', PlaceSchema);

