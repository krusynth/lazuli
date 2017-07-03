'use strict';

const fs = require('mz/fs');
const glob = require('glob');
const axios = require('axios');
const $ = require('cheerio');
const thenify = require('thenify');

const aGlob = thenify(glob);

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
    var found = false;
    while(!found) {
      found = await this.getMod(name, version);
      this.page++;
    }
  }

  getMod(name, version) {
    if(this.page > this.maxretries) {
      return Promise.reject(`Can't find ${name}@${version}. [${this.page-1} attempts]`);
    }

    return axios.get(this.filesurl(name), {responseType: 'text'})
      .then((body) => {
        var downloads = this.parsePage(body.data);

        var match = this.listFilter(downloads, version);

        if(match) {
          var newFile = this.generateModFilename(name, match.name);

          return this.downloadFile(match.link, newFile);
        }
      }).catch((err) => {
        return Promise.reject(`Can't find ${name}@${version}. [${err}]`);
      });
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

  downloadFile(url, newFile) {
    // Download the item with a progress bar.
    return axios(url, {responseType: 'stream'})
      .then((response) => {
        response.data.pipe(fs.createWriteStream(newFile));
        return true;
      });
  }

  // We use the same basename for creating and deleting files.
  generateModBasename(name) {
    // The name must begin with our internal name, lowercase.
    // We use --- as a separator here because some mods begin with a name
    // followed by a dash.  E.g., we don't want 'tinkers-construct' to collide
    // with a mod named 'tinkers'.
    return name.toLowerCase() + '---';
  }

  generateModFilename(name, filename) {
    // We need to rename the jar file to be able to remove it later.

    // Generate the base of the new name.
    var newName = this.generateModBasename(name);

    // Then, we append the original jar name, lowercase & cleaned up.
    newName += filename.toLowerCase().replace(/[^a-z0-9-.]/, '-');

    // Make sure it ends in .jar.
    if(newName.substr(-4) !== '.jar') {
      newName += '.jar';
    }

    // Then add our mods directory to the path.
    filename = this.modsdir + newName;

    return filename;
  }

  async remove(name) {
    var matchName = this.modsdir + this.generateModBasename(name) + '*.jar';

    return aGlob(matchName).then((fileMatches) => {
      if(fileMatches && Array.isArray(fileMatches) && fileMatches.length > 0) {
        // We expect exactly one matching file.
        if(fileMatches.length !== 1) {
          let fileList = "\n\n" + "\n".join(fileMatches);
          return Promise.reject(`Ambiguous match for ${name}. The following files were found: ${fileList}`);
        }

        let match = fileMatches[0];

        // console.log('Removing ' + name);
        return fs.unlink(match);
      }
      else {
        return Promise.reject(`Mod ${name} doesn't exist.`);
      }
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