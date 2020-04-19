'use strict';

const fs = require('fs');
const request = require('request');

/*
 * Defines a basic getter engine.
 */
module.exports = class RequestEngine {
  options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:71.0) Gecko/20100101 Firefox/71.0'
    }
  };

  constructor(options) {
    this.options = Object.assign(this.options, this.__copy(options));
  }

  /*
   * @returns Promise(string)
   */
  get(url) {
    return new Promise((resolve, reject) => {
      const options = {
        url: url,
        headers: this.options.headers
      };

      request(options, (error, response, body) => {
        if(!error) {
          resolve(body);
        }
        else {
          reject(error);
        }
      });
    });
  }

  /*
   * @returns Promise()
   */
  download(url, dest) {
    return new Promise((resolve, reject) => {
      // dest = this.__dest(dest);
      let file = fs.createWriteStream(dest);

      request(url, {})
        .pipe(file)
        .on('finish', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        })
    });
  }

  /*
   * Handle destination.
   */
  // __dest(dest, response) {
  //   if(typeof(dest) == 'function') {
  //     return dest(dest, response);
  //   }
  //   else {
  //     return dest;
  //   }
  // }

  /*
   * Creates a copy instead of a reference.
   */
  __copy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

