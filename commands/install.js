var CurseforgeRepository = require('../lib/curseforgeRepository');

module.exports = function installCommand(program) {
  'use strict';

  program
    .command('install [mods...]')
    .description('Install one or more mods.')
    .action(function(args, command) {
      var repo = new CurseforgeRepository(program.conf);

      var options = program.opts();

      var mods = {};
      if(args && args.length > 0) {
        for(var i = 0; i < args.length; i++) {
          var arg = args[i];
          mods[arg] = options.modversion || '*';
        }
      }
      else if(program.conf.mods) {
        mods = program.conf.mods;
      }

      if(mods && Object.keys(mods).length > 0) {
        for(var mod in mods) {
          var version = mods[mod];

          repo.get(mod, version, options.mcversion, options.release);
        }
      }
    });

};
