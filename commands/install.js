'use strict';

const Config = require('../lib/config');
const repoManager = require('../lib/repoManager');

module.exports = function installCommand(program) {

  program
    .command('install [mods...]')
    .description('Install one or more mods.')
    .action(install);

  function install(args, command) {
    let options = Config(program);

    // Todo: allow multiple repos for mods.
    let manager = new repoManager(options);
    manager.setup();

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
      manager.clearLockfile();
    }

    if(mods && Object.keys(mods).length > 0) {
      for(let [mod, version] of Object.entries(mods)) {
        let matchRepo = manager.default;
        for(let name in manager.repos) {
          let repo = manager.repos[name];
          if(repo.checkRepository(mod, version)) {
            matchRepo = repo;
          }
        }
        matchRepo.remove(mod, true)
        .catch(() => {})
        .finally(() => repoGet(matchRepo, mod, version));
      }
    }
  }

  function repoGet(repo, mod, version) {
    repo.get(mod, version).then((modDetails) => {
      console.log(`Installed ${mod} (${modDetails.release} ${modDetails.version})`.green);
      repo.updateLockfile(modDetails);
    })
    .catch((err) => {
      console.warn(`Error: Unable to install ${mod} ${version}`.red.bold);
      console.warn(err);
    });
  }

};
