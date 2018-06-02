const helmet = require('helmet');
const bodyParser = require('body-parser');
const express = require('express');
const winston = require('winston');
const expressWinston = require('express-winston');
const showsCast = require('../lib/shows-cast');
const { config } = require('../lib/commons');
const packageJson = require('../package.json');

const app = express();
const env = process.env.NODE_ENV;

let serverProcess;

const server = (() => {
  const start = (callback) => {
    app.use(expressWinston.errorLogger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ]
    }));
    app.use(helmet());
    app.use(bodyParser.json({
      type: '*/*'
    }));
    app.use(bodyParser.urlencoded({
      extended: true
    }));

    showsCast.routes(app);

    serverProcess = app.listen(config.get('PORT'), () => {
      winston.info('%s - Version: %s', packageJson.name, packageJson.version);
      if (env === 'production') {
        winston.info('------------------------------------------------------------------');
        winston.info('ATTENTION, %s ENVIRONMENT!', env);
        winston.info('------------------------------------------------------------------');
      } else {
        winston.warn('ENVIRONMENT: %s', env);
      }
      winston.info('Express server listening on port: %s', serverProcess.address().port);
    });
    return callback(null, app);
  };

  const close = (callback) => {
    if (serverProcess) {
      serverProcess.close(callback);
    }
  };

  return {
    start,
    close
  };
})();

module.exports = server;