'use strict';

const fs = require('mz/fs');
const axios = require('axios');
const $ = require('cheerio');

class CurseforgeRepository {
  constructor (options) {
    this.release = options.release || 'release';
    this.mcversion = options.mcversion;
    this.version = options.version;

    this.protocol = 'https';
    this.domain = 'minecraft.curseforge.com';
    this.baseUrl = `${this.protocol}://${this.domain}`;
    this.page = 1;
    this.maxretries = options.maxretries || 10;
    this.filesurl = (name) => `${this.baseUrl}/projects/${name}/files?page=${this.page}`;
    this.modsdir = 'mods/'
  }

  setup() {
    var promise = fs.exists(this.modsdir);
    return promise.then((fileExists) => {
      if(!fileExists) {
        console.log('Creating ' + this.modsdir);
        return fs.mkdir(this.modsdir);
      }
    });
  }

  async get(name, version) {
    // console.log(`Installing ${name} ${version}`);
    var found = false;
    while(!found) {
      found = await this.getMod(name, version);
      this.page++;
    }
  }

  getMod(name, version) {
    if(this.page > this.maxretries) {
      return this.errorNotFound(name, version);
    }

    return axios.get(this.filesurl(name), {responseType: 'text'})
      .then((body) => {
        var downloads = this.parsePage(body.data);

        var match = this.listFilter(downloads, version);

        if(match) {
          return this.downloadFile(match.link, match.name);
        }
      }).catch((err) => {
        return this.errorNotFound(name, version);
      });
  }

  errorNotFound(name, version) {
    return Promise.reject(`Can't find ${name}@${version}.`);
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

      // This isn't the actual version # of the file, but whatever was entered by the owner.
      dl.name = row.find('.project-file-name a').text().trim();
      dl.link = this.baseUrl + row.find('.project-file-name a').attr('href');

      downloads.push(dl);
    });

    return downloads;
  }

  listFilter(downloads, version) {
    // Get our parameters or use defaults.
    version = version || this.version;
    if(version === '*') {
      version = undefined;
    }
    var mcversion = this.mcversion;
    var release = this.release;

    var match = false;
    for(var i = 0; i < downloads.length; i++) {
      var dl = downloads[i];

      // Make sure we have a matching version.
      if(release && release.toLowerCase() !== dl.release.toLowerCase()) {
        continue;
      }
      if(mcversion && mcversion !== dl.mcversion) {
        continue;
      }
      if(version && version !== dl.version) {
        continue;
      }

      match = dl;
      break;
    }
    return match;
  }

  downloadFile(url, filename) {
    var newFile = this.modsdir + filename;
    if(newFile.substr(-4) !== '.jar') {
      newFile += '.jar';
    }

    // Download the item with a progress bar.
    return axios(url, {responseType: 'stream'})
      .then((response) => {
        response.data.pipe(fs.createWriteStream(newFile));
        return true;
      });
  }

  fsize(b) {
    var u = 0, s=1024;
    while (b >= s || -b >= s) {
        b /= s;
        u++;
    }
    return (u ? b.toFixed(1) + ' ' : b) + ' KMGTPEZY'[u] + 'B';
  }

}

module.exports = CurseforgeRepository;