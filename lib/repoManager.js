'use strict';

const fs = require('mz/fs');
const path = require('path');

class repoManager {
  constructor (options) {
    this.options = options;
    this.mcversion = options.mcversion;
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
    return fs.exists(this.options.modsdir)
    .then((fileExists) => {
      if(!fileExists) {
        return fs.mkdir(this.options.modsdir);
      }
      return Promise.resolve();
    });
  }

  // TODO:
  // * clean this up (error catching)
  // * handle recursive directories (rimraf?)
  clearMods() {
    let directory = this.options.modsdir;
    let files = fs.readdirSync(directory);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(directory, file));
      }
      catch(e) {
        console.log(e);
      }
    }
  }

  updateLockfile(mod) {
    // console.log('Update lockfile.');
    let filename = path.join(process.cwd(), 'lazuli.lock.json');

    return fs.exists(filename).then(fileExists => {
      let fileData = {};
      if(fileExists) {
        fileData = JSON.parse(fs.readFileSync(filename));
      }

      fileData.name = fileData.name || this.options.name;
      fileData.version = fileData.version || this.options.modversion;
      fileData.minecraft = fileData.minecraft || this.mcversion;
      fileData.mods = fileData.mods || {};

      let modData = mod;

      fileData.mods[mod.name] = mod;

      return fs.writeFile(filename, JSON.stringify(fileData, null, 4));
    });
  }

  async clearLockfile() {
    let filename = 'lazuli.lock.json';
    let fileExists = await fs.exists(filename);
    if(fileExists) {
      await fs.unlink(filename);
    }
  }
}

module.exports = repoManager;