'use strict';

const crypto = require('crypto');
const fs = require('mz/fs');
const Getter = require('../Getter');
const $ = require('cheerio');
const mkdirr = require('../../helpers/mkdirr');
const path = require('path');
const slugify = require('../../helpers/slugify');

class GenericRepository {
  constructor (options) {
    this.options = options;

    this.validReleases = options.validReleases;

    this.release = options.release || 'stable';
    if(this.release === '*') {
      this.release = false;
    }
    this.mcversion = options.mcversion;

    this.protocol = '';
    this.domain = '';
    this.baseUrl = ``;
    this.maxpages = options.maxpages || 5;
    this.filesurl = (name, page, version) => ``;

    this.modsdir = options.modsdir;

    this.releaseMap = {}

    if(!this.options.engine) {
      this.options.engine = 'PuppeteerEngine';
    }
    let engine = require(`../engines/${this.options.engine}`);

    this.getter = new Getter({'engine': engine});
  }

  async init(args) {
    return await this.getter.init(args);
  }

  async shutdown(args) {
    return this.getter.shutdown(args);
  }

  checkRepository(name, value) {
    return false;
  }

  async get(name, version) {
    let mod = false;
    let page = 0;
    for(page = 1; page <= this.maxpages; page++) {
      // console.log(`page ${page}`);
      mod = await this.findMod(name, page, version);
      if(mod) {
        return Promise.resolve(mod);
      }
    }
    return Promise.reject(`Can't get ${name}@${version}. (${page-1} attempts)`);
  }

  async findMod(name, page, version) {
    const body = await this.getter.get(this.filesurl(name, page));

    const downloads = this.parsePage(body);

    const match = this.listFilter(downloads, version);

    if(match) {
      match.name = name;
      return this.getMod(match);
    }
    // }).catch(err => {
    //   console.log(err.errorType, err);
    //   return Promise.reject(`Can't find ${name}@${version}.`);
    // });
  }

  getMod(match) {
    const newFile = this.generateModFilename(match.name, match.version);

    return this.downloadFile(match.link, newFile).then(() => {
      match.path = newFile;
      match.fullpath = fs.realpathSync(newFile);

      return fs.readFile(match.path).then((data) => {
        match.hash = crypto.createHash('md5').update(data).digest('hex');

        return match;
      }).catch((err) => {
        return Promise.reject(`Can't read ${match.fullpath}`);
      });
    }).catch((err) => {
      return Promise.reject(`Can't download ${match.link}`);
    });
  }

  parsePage(body) {
    let downloads = [];
    const dom = $.load(body);

    const rows = dom('table.listing-project-file tbody tr');

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
      dl.version = row.find('.project-file-name a').text().trim();
      dl.link = this.baseUrl + row.find('.project-file-name a').attr('href');

      downloads.push(dl);
    });

    return downloads;
  }

  /*
   * Returns a match object:
    {
      "mcversion": "1.12.2",
      "release": "stable",
      "version": "RedstoneFlux-1.12-2.0.2.3-universal.jar",
      "link": "https://minecraft.curseforge.com/projects/redstone-flux/files/2567260/download",
    }
   */
  listFilter(downloads, release) {
    // If we allow any release, set release to false.
    if(release === '*') {
      release = false;
    }

    // But we still want to default to the set release.
    release = release || this.release;

    let match = false;
    for(let i = 0; i < downloads.length; i++) {
      const dl = downloads[i];

      // Make sure we have a matching version.
      if(release) {
        // Release may be a keyword (e.g. 'stable')
        if(this.validReleases.includes(release)) {
          if(release !== dl.release) {
            continue;
          }
        }
        // Or a specific version (e.g. 'Buildcraft 7.1.22')
        else if(release !== dl.version) {
          continue;
        }
      }

      if(this.mcversion && this.mcversion !== dl.mcversion) {
        continue;
      }

      match = dl;
      break;
    }
    return match;
  }

  async downloadFile(url, newFile) {
    // Download the item.
    const body = await this.getter.download(url, newFile);
  }

  generateModFilename(name, filename) {
    // We need to rename the jar file to be able to remove it later.

    // Generate the base of the new name.
    let newName = name.toLowerCase() + '---';

    // Then, we append the original jar name, lowercase & cleaned up.
    newName += slugify(filename);

    // Make sure it ends in .jar.
    if(newName.substr(-4) !== '.jar') {
      newName += '.jar';
    }

    // Then add our mods directory to the path.
    filename = path.join(this.modsdir, newName);

    return filename;
  }

  fsize(b) {
    let u = 0, s=1024;
    while (b >= s || -b >= s) {
        b /= s;
        u++;
    }
    return (u ? b.toFixed(1) + ' ' : b) + ' KMGTPEZY'[u] + 'B';
  }
}

module.exports = GenericRepository;