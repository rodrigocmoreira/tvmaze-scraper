const axios = require('axios');
const pEachSeries = require('p-each-series');
const winston = require('winston');
const mapper = require('object-mapper');
const { config } = require('../commons/');

const service = (() => {
  const limitErrorCode = 429;

  const limitReachedHandler = async (url, show) => {
    winston.info(`Limit Reached on Load Cast ${url} - ${limitErrorCode}`);
    return new Promise((resolve) => {
      setTimeout(() => resolve(show),
        config.get('PENALTY_TIME'));
    });
  };

  const loadCastForShow = async (currentShow) => {
    const show = currentShow;
    const url = config.get('TVMAZE_CAST_URL').replace(':id', show.id);
    try {
      const response = await axios.get(url);
      if (response) {
        if (response.status === limitErrorCode) {
          winston.info(`Limit Reached on Load Cast ${url} - ${response.status}`);
          return new Promise((resolve) => {
            setTimeout(() => resolve(loadCastForShow(show)),
              config.get('PENALTY_TIME'));
          });
        }
        if (response.status === 200) {
          winston.info(`Cast GET for show ${show.name} done!`);

          const transformMapper = {
            '[].person.id': '[].id',
            '[].person.name': '[].name',
            '[].person.birthday': '[].birthday'
          };

          show.cast = mapper(response.data, [], transformMapper);
        }
      }
      if (!show.cast) {
        const noResponseCast = {};
        show.cast = noResponseCast;
      }
      return Promise.resolve(show);
    } catch (error) {
      if (error.response && error.response.status === limitErrorCode) {
        return limitReachedHandler(url, loadCastForShow(show));
      }
      winston.error(`Request Error ${url} - ${error.message}`);
      return Promise.reject(error);
    }
  };

  const loadCast = async (shows) => {
    try {
      if (shows.length > 0) {
        await pEachSeries(shows, async show => loadCastForShow(show));
      }
      return Promise.resolve(shows);
    } catch (error) {
      winston.error(`Error on load cast - ${error.message}`);
      return Promise.reject(error);
    }
  };

  return {
    loadCast
  };
})();

module.exports = service;
