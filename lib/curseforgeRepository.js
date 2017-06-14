'use strict';

const fs = require('fs');
const request = require('request');
const ProgressBar = require('progress');
const progress = require('request-progress');
const $ = require('cheerio');

class CurseforgeRepository {
  constructor (options) {

    this.release = options.release || 'release';
    this.mcversion = options.mcversion;
    this.version = options.version;

    this.protocol = 'https';
    this.domain = 'minecraft.curseforge.com';
    this.baseUrl = `${this.protocol}://${this.domain}`;
    this.filesurl = (name) => `${this.baseUrl}/projects/${name}/files`;
    this.modsdir = 'mods/'

    if(!fs.existsSync(this.modsdir)) {
      console.log('Creating ' + this.modsdir);
      fs.mkdirSync(this.modsdir);
    }
  }

  get (name, version, mcversion, release) {
    request(this.filesurl(name), (err, res, body) => {
      // Get our parameters or use defaults.
      version = version || this.version;
      if(version === '*') {
        version = null;
      }
      mcversion = mcversion || this.mcversion;
      release = release || this.release;

      var dom = $.load(body);
      var rows = dom('table.listing-project-file tbody tr');

      var downloads = [];

      rows.each( (i, row) => {
        var row = $(row);

        var dl = {};

        dl.mcversion = row.find('.project-file-game-version .version-label').text().trim();
        dl.release = row.find('.project-file-release-type div').attr('title').trim();

        // This isn't the actual version # of the file, but whatever was entered by the owner.
        dl.version = row.find('.project-file-name a').text().trim();
        dl.link = this.baseUrl + row.find('.project-file-name a').attr('href');

        downloads.push(dl);
      });

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

      if(match) {
        var newFile = this.modsdir + match.version;
        if(newFile.substr(-4) !== '.jar') {
          newFile += '.jar';
        }

        // Download the item with a progress bar.
        progress(request(match.link))
          .on('response', (res) => {
            var len = parseInt(res.headers['content-length'], 10);

            var bar = new ProgressBar(match.version + ' (' + match.release +
              ' ' + match.mcversion + ') [:bar] ' +
              this.fsize(res.headers['content-length']) + ' :percent :etas', {
              complete: '=',
              incomplete: ' ',
              width: 20,
              total: len
            });

            res.on('data', function (chunk) {
              bar.tick(chunk.length);
            });
          })
          .pipe(fs.createWriteStream(newFile));

        return true;
      }

      return false;

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