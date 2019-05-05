'use strict';

const repoManager = require('../lib/repoManager');

class Install {
  constructor(options) {
    // Todo: allow multiple repos for mods.
    this.manager = new repoManager(options);
    this.manager.setup();
  }

  clearLockfile() {
    return this.manager.clearLockfile();
  }

  clearMods() {
    return this.manager.clearMods();
  }

  // mods argument can be:
  // an object {'name1' => 'version1', 'name2', => 'version2'}
  // or a list [['name1', 'version1'], ['name2', 'version2']]
  run(mods) {
    let promises = [];

    if(mods) {
      if(!Array.isArray(mods) && typeof mods === 'object') {
        mods = Object.entries(mods);
      }
      for(let [mod, version] of mods) {
        promises.push(this.install(mod, version));
      }
    }
    return Promise.all(promises);
  }

  install(mod, version) {
    version = version || '*';
    let repo = this.matchRepo(mod, version);
    return repo.remove(mod, true)
      .catch((e) => { /* We ignore errors for now. */ })
      .then(() => this.repoGet(repo, mod, version));
  }

  matchRepo(mod, version) {
    let matchRepo = this.manager.default;
    for(let name in this.manager.repos) {
      let repo = this.manager.repos[name];
      if(repo.checkRepository(mod, version)) {
        matchRepo = repo;
      }
    }
    return matchRepo;
  }

  repoGet(repo, mod, version) {
    return repo.get(mod, version).then((modDetails) => {
      console.log(`Installed ${mod} (${modDetails.release} ${modDetails.version})`.green);
      return this.manager.updateLockfile(modDetails);
    })
    .catch((err) => {
      console.warn(`Error: Unable to install ${mod} ${version}`.red.bold);
      console.warn(err);
    });
  }
}

module.exports = Install;