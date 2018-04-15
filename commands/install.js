'use strict';

const CurseforgeRepository = require('../lib/curseforgeRepository');
const Config = require('../lib/config');

module.exports = function installCommand(program) {

  program
    .command('install [mods ...]')
    .description('Install one or more mods.')
    .action((args, command) => {
      let options = Config(program);

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

      if(mods && Object.keys(mods).length > 0) {
        // Todo: allow multiple repos for mods.
        let repo = new CurseforgeRepository(options);
        repo.setup().then( () => {
          for(let [mod, version] of Object.entries(mods)) {
            repo.get(mod, version)
              .then((modDetails) => {
                console.log(`Installed ${mod} (${modDetails.release} ${modDetails.version})`);
                repo.updateLockfile(modDetails);
              })
              .catch((err) => {
                console.warn(`Unable to install ${mod} ${version}`);
              });
          }
        });
      }
    });

};
