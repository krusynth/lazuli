'use strict';

const repoManager = require('./pkgmanager/repoManager');

class Uninstall {
  constructor(options) {
    // Todo: allow multiple repos for mods.
    this.manager = new repoManager(options);
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
      promises = mods.map(mod => this.manager.uninstall(mod));
    }
    return Promise.all(promises);
  }
}

module.exports = Uninstall;