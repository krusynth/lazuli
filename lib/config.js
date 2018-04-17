'use strict';

const path = require('path');

function cliOptions(program) {
  // Merge our command line arguments to override our config file.
  let options = Object.assign({}, program.conf,
    // Remove undefined options using the JSON twiddle.
    JSON.parse(JSON.stringify(program.opts())));

  // Handle versions.
  options.version = program.opts().version;
  options.modversion = program.conf.version;

  // Map these back to our defaults.
  return createOptions(options);
}

function createOptions(programOptions) {
	let options = {};
	options.builddir = './build/';
	options.modsdir =   path.join(options.builddir, 'mods');
	options.apidir =    path.join(options.builddir, 'api');
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
