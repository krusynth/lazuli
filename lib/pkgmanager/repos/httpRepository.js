'use strict';

const GenericRepository = require('./genericRepository');
const $ = require('cheerio');
const slugify = require('../../helpers/slugify');
const path = require('path');

class HttpRepository extends GenericRepository {
  constructor (options) {
    super(options);
  }

  checkRepository(name, value) {
    if(value.substring(0, 7) === 'http://' || value.substring(0, 8) === 'https://') {
      return true;
    }
  }

  generateModFilename(name, filename) {
    // We need to rename the jar file to be able to remove it later.

    // Generate the base of the new name.
    var newName = this.generateModBasename(name);

    // Then, we append the original jar name, lowercase & cleaned up.
    newName += slugify(filename.replace(/%20/g, '').replace("'", ''));

    // Make sure it ends in .jar.
    if(newName.substr(-4) !== '.jar') {
      newName += '.jar';
    }

    // Then add our mods directory to the path.
    filename = path.join(this.modsdir, newName);

    return filename;
  }

  async get(name, version) {
    let filename = version.split('/').pop();

    let mod = {
      mcversion: this.mcversion,
      name: name,
      version: filename,
      release: "custom",
      link: version
    }
    return this.getMod(mod);
  }
}

module.exports = HttpRepository;