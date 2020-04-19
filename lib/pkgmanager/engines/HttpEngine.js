'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

/*
 * Defines a basic getter engine.
 */
module.exports = class HttpEngine {
  options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:71.0) Gecko/20100101 Firefox/71.0'
    }
  };

  constructor(options) {
    this.options = Object.assign(this.options, this.__copy(options));
  }

  async init() { return true; }

  async shutdown() { return true; }

  /*
   * @returns Promise(string)
   */
  get(url) {
    const client = this.__client(url);

    return new Promise((resolve, reject) => {
      const options = {
        headers: this.options.headers
      };
      const request = client.get(url, options, response => {
        let content;

        response.on("data", chunk => content += chunk);
        response.on("end", () => resolve(content));
      });

      request.on('error', err => reject(err.message));
    });
  }

  /*
   * @returns Promise()
   */
  download(url, dest) {
    const client = this.__client(url);

    return new Promise((resolve, reject) => {
      const options = {
        headers: this.options.headers
      };
      const request = client.get(url, options, response => {

        // dest = this.__dest(dest, response);
        let file = fs.createWriteStream(dest);

        response.pipe(file);

        file.on('finish', () => resolve());
        file.on('error', err => {
          console.log('HttpEngine', err);
          fs.unlinkSync(dest);
          reject(err);
        });
      });

      request.on('error', err => reject(err.message));
    });
  }

  // Generates the correct client for a given url.
  __client(url) {
    let client = http;
    if(url.substring(0,6) === 'https:') {
      client = https;
    }
    return client;
  }


  /*
   * Handle destination.
   */
  // __dest(dest, response) {
  //   if(typeof(dest) == 'function') {
  //     return dest(dest, response);
  //   }
  //   else {
  //     return path.join(
  //       dest,
  //       path.basename(response.connection._httpMessage.path)
  //     );
  //   }
  // }

  /*
   * Creates a copy instead of a reference.
   */
  __copy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

