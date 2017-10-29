const request = require('request');
var Place = require('../models/place');

var express = require('express');
var router = express.Router();

/**
 * @param {int} osmId
 * @param {function} callback
 * @return {Promise}
 */
function loadFromDB(osmId, callback) {
  return Place.findOne({
    id: osmId,
  });
}

router.get('/:place_id', function(req, res, next) {
  const osmId = parseInt(req.params.place_id);

  loadFromDB(osmId)
      .then(function(data) {
        res.json(data);
      })
      .catch(function(err) {
        res.send(err);
      });
});

router.put('/:place_id', function(req, res, next) {
  const data = req.body;
  const query_id = parseInt(req.params.place_id) || 0;
  const id = data.id || 0;
  if (query_id !== id) {
    return res.json({
      status: 'error',
      message: 'The id from the query and the data does not match.',
    });
  }

  if (!data || !data.tags || !data.tags.name) {
    return res.json({
      status: 'error',
      message: 'tags are not send',
    });
  }
  console.log(id);
  const query = '[out:json][timeout:25];( node(' + id + ');); out; >; out skel qt;';

  /**
   * Update the place in the DB
   * @param {int} osmId
   * @param {object} data
   */
  const upset = function(osmId, data) {
    Place.findOneAndUpdate(
        {'id': id},
        data,
        {upsert: true},
        function(err, doc) {
          if (err) {
            console.log('error while upset');
            return res.send(500, {error: err});
          }
          console.log('upset successfully');
          return res.send("successfully saved");
        }
    )
  };

  return loadFromDB(id)
      .then(function(dbdata) {
        console.log('Found in DB and update it');
        return upset(id, data);
      })
      .catch(function(err) {
        console.log('Not in DB!');
        console.log('Load data from OSM');

        request({
          method: 'POST',
          body: query,
          uri: 'http://overpass-api.de/api/interpreter',
        }, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            var osmData = JSON.parse(body);
            const places = osmData.elements || [];
            if (places.length === 0) {
              return res.json({
                status: 'error',
                message: 'place with osmID: ' + id + ' not found!',
              });
            }
            const osm_place = places[0] || {};
            var place = new Place();

            place.id = osm_place.id;
            place.lat = osm_place.lat;
            place.lon = osm_place.lon;
            place.type = osm_place.type;
            place.tags = data.tags;
            place.save(function(err) {
              if (err)
                res.send(err);
              res.json({message: 'Place created!'});
            });

            //upset(id, data)
          } else {
            console.log('error', error, response);
            return res.send(error);
          }
        });
      });
});

module.exports = router;
