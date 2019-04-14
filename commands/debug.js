'use strict';

const Config = require('../lib/config');
const Debug = require('../lib/debug');

module.exports = function installCommand(program) {
  program
    .command('debug')
    .description('Debug mod problems.')
    .action((args, command) => {
      let options = Config(program);

      let debug = new Debug(options);

      debug.run(program.conf.mods)
      .catch((err) => {
        console.warn(err.red.bold);
      });
    });
};
