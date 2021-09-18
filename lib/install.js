'use strict';

const repoManager = require('./pkgmanager/repoManager');
const pLimit = require('p-limit');

class Install {
  constructor(options) {
    // Todo: allow multiple repos for mods.
    this.manager = new repoManager(options);

    this.limit = pLimit(options.plimit || 1);
  }

  async init(args) {
    return this.manager.init();
  }

  async shutdown(args) {
    return this.manager.shutdown();
  }

  clear() {
    this.manager.clear();
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
        promises.push(this.limit(() => this.manager.install(mod, version)));
      }
    }
    return Promise.all(promises);
  }
}

module.exports = Install;