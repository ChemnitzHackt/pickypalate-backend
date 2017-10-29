const request = require('request');
var Place = require('../models/place');

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  Place.find(function(err, places) {
    if (err)
      res.send(err);
    res.json(places);
  });
});

function annotateOsmData(osmData) {

  const osmElements = osmData.elements;

  var newElements = osmElements.map(function(element) {


  });

  return osmData;
}

router.get('/:latitude/:longitude', function(req, res, next) {
  next();
});


router.get('/:latitude/:longitude/:filters?', function(req, res, next) {
  const latitude = parseFloat(req.params.latitude);
  const longitude = parseFloat(req.params.longitude);

  const offset = 0.1;
  const south = latitude - offset;
  const west = longitude - offset;
  const north = latitude + offset;
  const east = longitude + offset;

  const defaultFilters = '' +
      'node["shop"="bakery"](' + south + ',' + west + ',' + north + ',' + east + ');\n' +
      'node["shop"="restaurant"](' + south + ',' + west + ',' + north + ',' + east + ');\n';

  const filters = (req.params.filters) ? req.params.filters.split(',') : [];

  const nodes = filters.map(function(filter) {
    return 'node["' + filter + '"="yes"](' + south + ',' + west + ',' + north + ',' + east + ');';
  });

  const query = '[out:json][timeout:25];(' + nodes.join('\n') + defaultFilters + '); out; >; out skel qt;';

  console.log('query', query);

  request({
    method: 'POST',
    body: query,
    uri: 'http://overpass-api.de/api/interpreter'
  }, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var osmData = JSON.parse(body);

      var elements = osmData.elements.map(function(osmElement) {
        return Place.findOne({
          id: osmElement.id,
        }).then(function(data) {
          return data || osmElement;
        }).catch(function(data) {
          return osmElement;
        });
      });

      Promise.all(elements)
          .then(function(processedElements) {
            osmData.elements = processedElements;
            return res.json(osmData);
          }).catch(function(err) {
        console.log('error:', err);
        res.send('error');
      });
    } else if (response.statusCode === 429) {
      res.json({
        status: 'error',
        message: 'rate limit exceeded',
      });
    } else {
      console.log('error', error, response);
      res.send(error);
    }
  });

});

router.post('/', function(req, res, next) {
  var d = new Date();
  var n = d.getTime();
  var place = new Place();
  place.name = req.body.name || 'unknown name';
  place.id = req.body.osmId || n;

  // save the bear and check for errors
  place.save(function(err) {
    if (err)
      res.send(err);
    res.json({message: 'Place created!'});
  });
});

module.exports = router;
