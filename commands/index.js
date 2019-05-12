// Adapted from https://github.com/tsantef/commander-starter

var fs = require('fs');
var path = require('path');
require('json5/lib/register')

module.exports = function commandLoader(program) {
  'use strict';

  var commands = {};
  var loadPath = path.dirname(__filename);

  // Loop though command files
  fs.readdirSync(loadPath).filter(function (filename) {
    return (/\.js$/.test(filename) && filename !== 'index.js');
  }).forEach(function (filename) {
    var name = filename.substr(0, filename.lastIndexOf('.'));

    // Require command
    var command = require(path.join(loadPath, filename));

    var configFile = path.join(process.cwd(), 'lazuli.config');

    if(program.config) {
       configFile = program.config;
    }
    try {
      program.conf = require(configFile);
    }
    catch(e) {}

    // Initialize command
    commands[name] = command(program);
  });

  return commands;
};