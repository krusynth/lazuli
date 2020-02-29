'use strict';

const crypto = require('crypto');
const fs = require('mz/fs');
const glob = require('glob');
const axios = require('axios');
const cloudscraper = require('cloudscraper').defaults({
  agentOptions: {
    ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256'
  }
});
const $ = require('cheerio');
const thenify = require('thenify');

const aGlob = thenify(glob);
const mkdirr = require('./mkdirr');
const path = require('path');
const slugify = require('./slugify');

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
    this.filesurl = (name, page) => ``;

    this.modsdir = options.modsdir;

    this.releaseMap = {}
  }

  checkRepository(name, value) {
    return false;
  }

  async get(name, version) {
    let mod = false;
    let page = 0;
    for(page = 1; page < this.maxpages; page++) {
      mod = await this.findMod(name, page, version);
      if(mod) {
        return Promise.resolve(mod);
      }
    }
    return Promise.reject(`Can't get ${name}@${version}. [${page} attempts]`);
  }

  findMod(name, page, version) {
    return cloudscraper.get({
      url: this.filesurl(name, page)
      // encoding: null,
      // resolveWithFullResponse: true
      // responseType: 'text'
    })
    // return axios.get(this.filesurl(name, page), {
    //   withCredentials: true,
    //   responseType: 'text',
    //   headers: {
    //     'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:72.0) Gecko/20100101 Firefox/72.0',
    //     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //     'Accept-Language': 'en-US,en;q=0.5',
    //     'Accept-Encoding': 'gzip, deflate, br',
    //     'DNT': 1,
    //     'Connection': 'keep-alive',
    //     'Cookie': 'Unique_ID_v2=8edf490c0bb1456fb6da38beaccb8813; __cfduid=d622bc94e93ed1fc54356d6f3d115050a1556243617; ResponsiveSwitch.DesktopMode=1; __cfduid=d3f5a5c7c15b3c834004b9631b87db8181560703969; cdmgeo=us; AWSALB=JrTVO3+qlPatX0uIhm8FC01dvIn3bcZJD4FNhGG/ZJDfHecfTR0Xppy2/wOAXrEz4AoS3WGMUirtXTnn1j9nVUOQKe2Bc7szQasWqRIPPvPjPUOMQh4Ass/1K5dX; __cf_bm=166121a4245c5933219bcf10535a9a1d63d9311f-1577727751-1800-AdUwUH7TgkBLx25tQQ1N8I4YB2IvE56ZF7+vM5/r9QQf4sf1eRmLPuk25uStvqTstxgrV8599y/7OhV0jHUL5Rs=',
    //     'Upgrade-Insecure-Requests': 1,
    //     'Pragma': 'no-cache',
    //     'Cache-Control': 'no-cache'
    //   }
    // })
    .then(body => {
      const downloads = this.parsePage(body);

      const match = this.listFilter(downloads, version);

      if(match) {
        match.name = name;
        return this.getMod(match);
      }
    }).catch(err => {
      console.log(err.errorType, err);
      return Promise.reject(`Can't find ${name}@${version}.`);
    });
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

  downloadFile(url, newFile) {
    // Download the item.
    return cloudscraper.get({
      url: url,
      encoding: null,
      resolveWithFullResponse: true,
      rejectUnauthorized: false,
      // responseType: 'text'
    })
    .then(response => {
      // return new Promise((resolve, reject) => {
        fs.writeFileSync(newFile, response.body);
        // let stream = fs.createWriteStream(newFile);
        // stream.on('finish', () => { resolve(); });
        // stream.on('error', reject);

        // response.data.pipe(stream);
      // });
    })
    .catch(err => {
      return Promise.reject(err);
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
    let newName = this.generateModBasename(name);

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

  async remove(name, force) {
    let matchName = path.join(this.modsdir,
      this.generateModBasename(name) + '*.jar');

    return aGlob(matchName).then((fileMatches) => {
      if(fileMatches && Array.isArray(fileMatches) && fileMatches.length > 0) {
        // We expect exactly one matching file.
        if(fileMatches.length !== 1 && force != true) {
          let fileList = "\n\n" + "\n".join(fileMatches);
          return Promise.reject(`Ambiguous match for ${name}. The following files were found: ${fileList}`);
        }
        let promises = [];
        fileMatches.forEach(match => promises.push(fs.unlink(match)));
        return Promise.all(promises);
      }
      else {
        return Promise.reject(`Mod ${name} doesn't exist.`);
      }
    });
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