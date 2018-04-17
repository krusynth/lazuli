'use strict';

const CurseforgeRepository = require('../lib/curseforgeRepository');
const Config = require('../lib/config');

module.exports = function installCommand(program) {

  program
    .command('install [mods ...]')
    .description('Install one or more mods.')
    .action((args, command) => {
      let options = Config(program);
      let repo = new CurseforgeRepository(options);

      let mods = {};
      if(args && args.length > 0) {
        let modversion = options.modversion || '*';
        for(let arg of args) {
          mods[arg] = modversion;
        }
      }
      else if(program.conf.mods) {
        mods = program.conf.mods;
      }

      if(mods && (!args || args.length === 0)) {
        // If we're installing from scratch, remove the old lockfile.
        repo.clearLockfile();
      }

      if(mods && Object.keys(mods).length > 0) {
        // Todo: allow multiple repos for mods.
        repo.setup().then( () => {
          for(let [mod, version] of Object.entries(mods)) {
            repo.get(mod, version)
              .then((modDetails) => {
                console.log(`Installed ${mod} (${modDetails.release} ${modDetails.version})`.green);
                repo.updateLockfile(modDetails);
              })
              .catch((err) => {
                console.warn(`Error: Unable to install ${mod} ${version}`.red.bold);
              });
          }
        })
        .catch((err) => {
          console.warn(err.red.bold);
        });;
      }
    });

};
