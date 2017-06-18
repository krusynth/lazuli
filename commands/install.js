var CurseforgeRepository = require('../lib/curseforgeRepository');

module.exports = function installCommand(program) {
  'use strict';

  program
    .command('install [mods...]')
    .description('Install one or more mods.')
    .action(function(args, command) {
      // Merge our command line arguments to override our config file.
      let options = Object.assign(program.conf,
        // Remove undefined options using the JSON twiddle.
        JSON.parse(JSON.stringify(program.opts())));

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
        let repo = new CurseforgeRepository(options);
        repo.setup().then( () => {
          for(let [mod, version] of Object.entries(mods)) {
              repo.get(mod, version)
                .then(() => {
                  console.log(`Installed ${mod}`);
                })
                .catch((err) => {
                  console.warn(err);
                });
          }
        });
      }
    });

};
