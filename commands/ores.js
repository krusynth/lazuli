'use strict';

const Ores = require('../lib/ores');
const Config = require('../lib/config');

module.exports = function oresCommand(program) {

  program
    .command('ores')
    .description('Manage ores in mods.')
    .action((args, command) => {
      let options = Config(program);

      let ores = new Ores(options);
      ores.setup()
      .then(result => {
        if(!result) {
          return;
        }

        ores.frequency()
        .catch(err => {
          // console.warn(err.red.bold);
          console.warn(err);
        });;
      });
    });
};
