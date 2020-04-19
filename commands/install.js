'use strict';

const Config = require('../lib/config');
const Install = require('../lib/install');

module.exports = function installCommand(program) {

  program
    .command('install [mods...]')
    .description('Install one or more mods.')
    .action(install);

  async function install(args, command) {
    let options = Config(program);
    let installer = new Install(options);
    await installer.init();

      let mods = {};
      if(args && args.length > 0) {
        for(let arg of args) {
          let [name, modversion] = arg.split('@');
          modversion = modversion || '*';
          mods[name] = modversion;
        }
      }
      else if(program.conf.mods) {
        mods = program.conf.mods;
      }

      if(mods && (!args || args.length === 0)) {
        // If we're installing from scratch, remove the old lockfile.
        installer.clear();
      }

      await installer.run(mods);
      await installer.shutdown();
      return true;
  }
};
