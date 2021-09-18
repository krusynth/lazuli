'use strict';

const GenericRepository = require('./genericRepository');
const $ = require('cheerio');

class CurseforgeRepository extends GenericRepository {
  constructor (options) {
    super(options);

    this.protocol = 'https';
    this.domain = 'www.curseforge.com';
    this.baseUrl = `${this.protocol}://${this.domain}`;

    this.filesurl = (name, page, version) => `${this.baseUrl}/minecraft/mc-mods/${name}/files/all?sort=-game-version&page=${page}&filter-game-version=${version}`;

    this.releaseMap = {
      'r': 'stable',
      'a': 'alpha',
      'b': 'beta'
    }
    this.versionString = '';
  }

  checkRepository(name, value) {
    if(value.substring(0, 6) === 'curse@') {
      return true;
    }
  }

  async findMod(name, page, version) {
    const url = this.filesurl(name, page, this.versionString);
    const body = await this.getter.get(url);
    const dom = $.load(body);
    const downloads = this.parsePage(dom);
    const match = this.listFilter(downloads, version);

    if(match) {
      match.name = name;
      return this.getMod(match);
    }
    else if(page === 1 && this.versionString === '') {
      const versions = dom('select#filter-game-version option');

      versions.each( (i, row) => {
        row = $(row);
        let str = row.text().trim();
        if(str === this.options.mcversion) {
          this.versionString = row.val();
          return false;
        }
      });

      if(this.versionString) {
        return this.findMod(name, page, version);
      }
    }
  }

  parsePage(dom) {
    let downloads = [];
    const rows = dom('table.listing-project-file tbody tr');

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