'use strict';

const fs = require('mz/fs');
const path = require('path');

class repoManager {
  constructor (options) {
    this.options = options;
    this.reposdir = path.join(path.dirname(__filename), 'repo');
    this.repos = {};
  }

  async setup() {
    await Promise.all([
      this.registerRepos(),
      this.setupDirs()
    ]);
  }

  registerRepos() {
    return new Promise((resolve, reject) => {
      let fileExists = fs.existsSync(this.reposdir);
      if(fileExists) {
        let items = fs.readdirSync(this.reposdir);

        for(let i=0; i<items.length; i++) {
          try {
            let name = items[i].split('.')[0];
            let cls = require(path.join(this.reposdir, items[i]));
            let clsName = cls.name;
            this.repos[clsName] = new cls(this.options);
          } catch(e) { console.warn(e); };
        }

        // We default to using curseforge for lack of any specific options.
        this.default = this.repos['CurseforgeRepository'];

        resolve();
      }
      reject('No repository handlers to load.');
    });
  }

  setupDirs() {
    return fs.exists(this.options.modsdir).then((fileExists) => {
      if(!fileExists) {
        mkdirr(this.options.modsdir);
        console.log('resolve setupDirs');
        return Promise.resolve();
      }
    });
  }

  async clearLockfile() {
    var filename = 'lazuli.lock.json';
    let fileExists = await fs.exists(filename);
    if(fileExists) {
      await fs.unlink(filename);
    }
  }
}

module.exports = repoManager;