'use strict';

const path = require('path');
require('dotenv').config();

function cliOptions(program) {
  // Merge our command line arguments to override our config file.
  let options = Object.assign({}, program.conf,
    // Remove undefined options using the JSON twiddle.
    JSON.parse(JSON.stringify(program.opts())));

  // Handle versions.
  options.apikey = options.apikey || process.env.apikey || '';

  // Map these back to our defaults.
  return createOptions(options);
}

function createOptions(programOptions) {
  let options = {};
  options.modsdir   = path.join('./', 'mods');
  options.configdir = path.join('./', 'config');
  options.builddir  = './build/';
  options.apidir    = path.join(options.builddir, 'api');
  options.clientdir = path.join(options.builddir, 'client');
  options.serverdir = path.join(options.builddir, 'server');
  options.deploydir = path.join(options.builddir, 'resources');

  options.validReleases = ['stable', 'alpha', 'beta']
  options.release = 'stable';

  // Stomp our defaults with the user-provided options.
  options = Object.assign(options, programOptions);

  return options;
}

module.exports = cliOptions;
