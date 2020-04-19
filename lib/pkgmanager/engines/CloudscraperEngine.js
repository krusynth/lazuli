'use strict';

const fs = require('fs');
const cloudscraper = require('cloudscraper');
const HttpEngine = require('./HttpEngine');

/*
 * Cloudscraper implementation to get around CloudFlare restrictions.
 */
module.exports = class CloudscraperEngine extends HttpEngine {
  options = {
    get: {
    },
    // These options ensure we can download the file directly.
    // We also ignore SSL errors.
    download: {
      encoding: null,
      resolveWithFullResponse: true,
      rejectUnauthorized: false
    }
  }

  /*
   * @return Promise(<text>)
   */
  get(url) {
    let options = this.__copy(this.options.get);
    options.url = url;

    return cloudscraper.get(options)
    .then(body => body)
    .catch(err => Promise.reject(err));
  }

  /*
   * @return Promise()
   */
  download(url, dest) {
    let options = this.__copy(this.options.download);
    options.url = url;

    return cloudscraper.get(options)
    .then(response => {
      // dest = this.dest(dest, response);
      let file = fs.writeFileSync(dest, response.body);
    })
    .catch(err => Promise.reject(err));
  }
}

