'use strict';

const GenericRepository = require('../genericRepository');
const $ = require('cheerio');

class CurseforgeRepository extends GenericRepository {
  constructor (options) {
    super(options);

    this.protocol = 'https';
    this.domain = 'minecraft.curseforge.com';
    this.baseUrl = `${this.protocol}://${this.domain}`;

    this.filesurl = (name, page) => `${this.baseUrl}/projects/${name}/files?sort=-game-version&page=${page}`;

    this.releaseMap = {
      'release': 'stable',
      'alpha': 'alpha',
      'beta': 'beta'
    }
  }

  checkRepository(name, value) {
    if(value.substring(0, 6) === 'curse@') {
      return true;
    }
  }

  parsePage(body) {
    var downloads = [];
    var dom = $.load(body);
    var rows = dom('table.listing-project-file tbody tr');

    rows.each( (i, row) => {
      row = $(row);
      let dl = {};

      dl.mcversion = row.find('.project-file-game-version .version-label').text().trim();
      dl.release = row.find('.project-file-release-type div').attr('title').trim();
      dl.release = dl.release.toLowerCase();

      if(this.releaseMap && this.releaseMap[dl.release]) {
        dl.release = this.releaseMap[dl.release];
      }

      // This isn't the actual version # of the file, but whatever was entered by the owner.
      dl.version = row.find('.project-file-name a.overflow-tip').text().trim();

      dl.link = this.baseUrl + row.find('.project-file-name a').attr('href');

      downloads.push(dl);
    });

    return downloads;
  }
}

module.exports = CurseforgeRepository;