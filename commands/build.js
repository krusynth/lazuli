'use strict';

const Build = require('../lib/build');
const Config = require('../lib/config');

module.exports = function installCommand(program) {

  program
    .command('build [dest...]')
    .description('Generate assets.')
    .action((args, command) => {
      let options = Config(program);

      let build = new Build(options);

      build.build(args)
      	.catch((err) => {
      		console.warn(err.red.bold);
      	});
    });
};
