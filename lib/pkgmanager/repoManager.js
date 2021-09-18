'use strict';

const fs = require('mz/fs');
const path = require('path');
const glob = require('glob');
const cacheService = require('../services/cacheService');

class repoManager {
  constructor (options) {
    this.options = options;
    // Lacking any specific options, we default to using curseforge.
    this.options.default = this.options.default || 'CurseforgeRepository';
    this.mcversion = options.mcversion;
    this.reposdir = path.join(path.dirname(__filename), 'repos');
    this.repos = {};

    this.cache = new cacheService(this.options);
  }

  async init() {
    return Promise.all([
      this.cache.init(),
      this.setupDirs(),
      this.registerRepos()
    ]);
  }

  async shutdown(args) {
    let promises = [];
    for (const [key, item] of Object.entries(this.repos)) {
      promises.push(this.repos[key].shutdown());
    }
    return Promise.all(promises)
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

        // Initialize our classes.
        let promises = [];
        for (const [key, item] of Object.entries(this.repos)) {
          promises.push(this.repos[key].init());
        }

        return Promise.all(promises)
        .then(() => {
          this.default = this.repos[this.options.default];
          resolve();
        });
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

  async install(mod, version) {
    version = version || '*';

    let repo = this.matchRepo(mod, version);
    return this.remove(mod, true)
      .catch((e) => { /* We ignore errors for now. */ })
      .then(() => this.get(repo, mod, version));
  }

  matchRepo(mod, version) {
    let matchRepo = this.default;
    for(let name in this.repos) {
      let repo = this.repos[name];
      if(repo.checkRepository(mod, version)) {
        matchRepo = repo;
      }
    }
    return matchRepo;
  }

  get(repo, mod, version) {
    return repo.get(mod, version).then((modDetails) => {
      console.log(`Installed ${mod} (${modDetails.release} ${modDetails.version})`.green);
      return this.cache.add(modDetails);
    })
    .catch((err) => {
      console.warn(`Error: Unable to install ${mod} ${version}`.red.bold);
      console.warn(err);
    });
  }

  remove(name, force) {
    let matchName = path.join(this.options.modsdir,
      name.toLowerCase + '---*.jar');

    let fileMatches = glob.sync(matchName);

    if(fileMatches && Array.isArray(fileMatches) && fileMatches.length > 0) {
      // We expect exactly one matching file.
      if(fileMatches.length !== 1 && force != true) {
        let fileList = "\n\n" + "\n".join(fileMatches);
        return Promise.reject(`Ambiguous match for ${name}. The following files were found: ${fileList}`);
      }
      return Promise.all(
        fileMatches.map(match => this.delete(match))
      );
    }
    else {
      return Promise.reject(`Mod ${name} doesn't exist.`);
    }
  }

  uninstall(name) {
    let mod = this.cache.getMod(name);
    let promise;
    if(mod) {
      promise = this.delete(mod.path);
    }
    else {
      promise = this.remove(name);
    }
    return promise.then(filename => {this.cache.delete(name); return filename;});
  }

  delete(file) {
    let filename = path.join(process.cwd(), file);
    return fs.unlink(filename).then(() => file);
  }

  // TODO:
  // * clean this up (error catching)
  // * handle recursive directories (rimraf?)
  clear() {
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
    this.cache.clear();
  }
}

module.exports = repoManager;