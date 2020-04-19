'use strict';

const fs = require('mz/fs');
const path = require('path');

class cacheService {
  options = {
    lockfile: null
  }
  data = {
    mods: {}
  };

  constructor (options) {
    this.options = options;
    if(!this.options.lockfile) {
      this.options.lockfile = path.join(process.cwd(), 'lazuli.lock.json');
    }
  }

  async init() {
    if(fs.existsSync(this.options.lockfile)) {
      this.data = JSON.parse(fs.readFileSync(this.options.lockfile));;
    }
    this.data.mods = this.data.mods || {};
    this.data.mcversion = this.options.mcversion;
  }

  add(mod) {
    this.data.mods[mod.name] = mod;
    this.update();
  }

  delete(name) {
    delete this.data.mods[name];
    this.update();
  }

  update(mod) {
    fs.writeFileSync(this.options.lockfile, JSON.stringify(this.data, null, 4));
  }

  clear() {
    if(fs.existsSync(this.options.lockfile)) {
      fs.unlinkSync(this.options.lockfile);
    }
  }

  getMod(name) {
    return this.data.mods[name];
  }
}

module.exports = cacheService;