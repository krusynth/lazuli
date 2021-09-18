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