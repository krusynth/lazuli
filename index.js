'use strict';

const program = require('commander');

var commands = require('./commands')(program);
var packageJson = require('./package.json');

program
  .version(packageJson.version)
  // .option('-o, --option','option description')
  // .option('-m, --more','we can have as many options as we want')
  // .option('-i, --input [optional]','optional user input')
  // .option('-I, --another-input <required>','required user input')
  .command('install [name]', 'install one or more packages')
  .parse(process.argv);
