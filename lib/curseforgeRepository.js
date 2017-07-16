'use strict';

const GenericRepository = require('./genericRepository');

class CurseforgeRepository extends GenericRepository {
  constructor (options) {
    super(options);

    this.protocol = 'https';
    this.domain = 'minecraft.curseforge.com';
    this.baseUrl = `${this.protocol}://${this.domain}`;

    this.filesurl = (name, page) => `${this.baseUrl}/projects/${name}/files?page=${page}`;

    this.releaseMap = {
      'release': 'stable',
      'alpha': 'alpha',
      'beta': 'beta'
    }
  }
}

module.exports = CurseforgeRepository;