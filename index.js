'use strict';

const program = require('commander');

const commands = require('./commands')(program);
const packageJson = require('./package.json');

program
  .version(packageJson.version)
  // .option('-o, --option','option description')
  // .option('-m, --more','we can have as many options as we want')
  // .option('-i, --input [optional]','optional user input')
  // .option('-I, --another-input <required>','required user input')
  .usage('<command> [options]')
  .option('--config [file]', 'The config file to use.')
  .option('--modversion [version]', 'The version of the mod to use.')
  .option('--mcversion [version]', 'The version of Minecraft to use.')
  .option('--release [type]', 'The release to use: alpha, beta, or release (default)')
  .parse(process.argv)
