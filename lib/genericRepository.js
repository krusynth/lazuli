'use strict';

const crypto = require('crypto');
const fs = require('mz/fs');
const glob = require('glob');
const axios = require('axios');
const $ = require('cheerio');
const thenify = require('thenify');

const aGlob = thenify(glob);

class GenericRepository {
  constructor (options) {
    this.validReleases = ['stable', 'alpha', 'beta']

    this.release = options.release || 'stable';
    if(this.release === '*') {
      this.release = false;
    }

    this.options = options;

    this.mcversion = options.mcversion;

    this.protocol = '';
    this.domain = '';
    this.baseUrl = ``;
    this.maxpages = options.maxpages || 5;
    this.filesurl = (name, page) => ``;
    this.modsdir = 'mods/'

    this.releaseMap = {}
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
    var mod = false;
    for(var page = 1; page < this.maxpages; page++) {
      mod = await this.getMod(name, page, version);
      if(mod) {
        return Promise.resolve(mod);
      }
    }
    return Promise.reject(`Can't get ${name}@${version}. [${page} attempts]`);
  }

  getMod(name, page, version) {
    return axios.get(this.filesurl(name, page), {responseType: 'text'})
      .then((body) => {
        var downloads = this.parsePage(body.data);

        var match = this.listFilter(downloads, version);

        if(match) {
          match.name = name;

          var newFile = this.generateModFilename(name, match.version);

          return this.downloadFile(match.link, newFile).then(() => {
            match.path = newFile;
            match.fullpath = fs.realpathSync(newFile);

            return fs.readFile(match.path).then((data) => {
              match.hash = crypto.createHash('md5').update(data).digest('hex');

              return match;
            });
          });
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

  listFilter(downloads, release) {
    // If we allow any release, set release to false.
    if(release === '*') {
      release = false;
    }

    // But we still want to default to the set release.
    release = release || this.release;

    var match = false;
    for(var i = 0; i < downloads.length; i++) {
      var dl = downloads[i];

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

  downloadFile(url, newFile) {
    // Download the item.
    return axios(url, {responseType: 'stream'})
      .then((response) => {
        return new Promise((resolve, reject) => {
          let stream = fs.createWriteStream(newFile);
          stream.on('finish', () => { resolve(); });
          stream.on('error', reject);

          response.data.pipe(stream);
        });
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

  updateLockfile(mod) {
    var filename = 'lazuli.lock.json';
    return fs.exists(filename).then((fileExists) => {

      var fileData = {};
      if(fileExists) {
        fileData = JSON.parse(fs.readFileSync(filename));
      }

      fileData.name = fileData.name || this.options.name;
      fileData.version = fileData.version || this.options.version;
      fileData.minecraft = fileData.minecraft || this.mcversion;
      fileData.mods = fileData.mods || {};

      var modData = mod;

      fileData.mods[mod.name] = mod;



      return fs.writeFile(filename, JSON.stringify(fileData, null, 4));
    });
  }

}

module.exports = GenericRepository;