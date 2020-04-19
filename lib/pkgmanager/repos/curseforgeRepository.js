'use strict';

const GenericRepository = require('./genericRepository');
const $ = require('cheerio');

class CurseforgeRepository extends GenericRepository {
  constructor (options) {
    super(options);

    this.protocol = 'https';
    this.domain = 'www.curseforge.com';
    this.baseUrl = `${this.protocol}://${this.domain}`;

    this.filesurl = (name, page) => `${this.baseUrl}/minecraft/mc-mods/${name}/files/all?sort=-game-version&page=${page}`;

    this.releaseMap = {
      'r': 'stable',
      'a': 'alpha',
      'b': 'beta'
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
      let tds = row.find('td');
      let dl = {};

      dl.mcversion = $(tds[4]).find('div > div').text().trim();
      dl.release = $(tds[0]).find('div span').text().trim().toLowerCase();

      if(this.releaseMap && this.releaseMap[dl.release]) {
        dl.release = this.releaseMap[dl.release];
      }

      // This isn't the actual version # of the file, but whatever was entered by the owner.
      dl.version = row.find('a[data-action=file-link]').text().trim().replace(/\.jar$/, '');

      let link = $(tds[6]).find('a')[0].attribs.href;

      dl.link = this.baseUrl + link + '/file';

      downloads.push(dl);
    });

    return downloads;
  }
}

module.exports = CurseforgeRepository;