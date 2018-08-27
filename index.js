const winston = require('winston');
const { series } = require('async');
const { name: packageName } = require('./package.json');
const application = require('./lib/application');

const shutdown = () => {
  winston.info('Gracefully shutdown in progress');
  application.close(() => {
    process.exit(0);
  });
};

const startApplication = async () => {
  await application.start();
};

const startScraper = (callback) => {
  application.scraper(callback);
};

process
  .on('SIGTERM', shutdown)
  .on('SIGINT', shutdown)
  .on('SIGHUP', shutdown)
  .on('uncaughtException', (err) => {
    winston.error('uncaughtException caught the error: ', JSON.stringify(err));
    throw err;
  })
  .on('exit', (code) => {
    winston.info('Node process exit with code: %s', code);
  });

process.title = packageName;

winston.info('[APP] Starting application initialization');

series([
  startApplication,
  startScraper
], (err) => {
  if (err) {
    winston.error('[APP] initialization failed', err);
  } else {
    winston.info('[APP] initialized SUCCESSFULLY');
  }
});
