'use strict';

const fs = require('fs');
const path = require('path');
const HttpEngine = require('./HttpEngine');
const puppeteer = require('puppeteer');

/*
 * Cloudscraper implementation to get around CloudFlare restrictions.
 */
module.exports = class PuppeteerEngine extends HttpEngine {
  options = {
    get: {
    },
    // These options ensure we can download the file directly.
    // We also ignore SSL errors.
    download: {
      wait: 5000, // 5 seconds should just about do it for most files.
      temp: null
    },
    headless: false
  };
  browser = null;

  async init(args) {
    this.browser = await puppeteer.launch({headless: this.options.headless});
    this.options.download.temp = this.tmpDir();
    return true;
  }

  async shutdown() {
    return this.browser.close();
  }

  /*
   * @return Promise(<text>)
   */
  async get(url) {
    let options = this.__copy(this.options.get);
    options.url = url;

    const pg = await this.browser.newPage();

    await pg.goto(url);
    await pg.waitFor(1000);
    // await pg.screenshot({path: '/Users/krues8dr/Desktop/curse.png'});
    let body = await pg.evaluate(() => document.body.innerHTML);

    return body;
  }

  /*
   * @return Promise()
   */
  async download(url, dest) {
    let options = this.__copy(this.options.download);
    options.url = url;

    return new Promise( async(resolve, reject) => {

      const pg = await this.browser.newPage();
      await pg._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: this.options.download.temp});

      let redirect = false;
  // pg.on('request', req => { console.log(req.headers()) });
      pg.on('response', async (resp) => {
        if(resp._headers.location) {
          redirect = resp._headers.location;

          await pg._client.send("Page.stopLoading");
        }
      });
      // pg.on('load', () => { console.log('loaded'); })
      await pg.goto(url, {waitUntil: 'domcontentloaded'})
        .catch( err => null /* console.log(err) */ )

      if(redirect) {
        await this.download(redirect, dest);
      }
      else {
        await pg.waitFor(this.options.download.wait);

        // We should only have one file in our new temp dir.
        let files = fs.readdirSync(this.options.download.temp);

        fs.renameSync(path.join(this.options.download.temp, files[0]), dest);
      }
      resolve(true);
    });
  }

  tmpDir() {
     let str = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
     let tmp = path.join('/tmp', str);
     fs.mkdirSync(tmp);
     return tmp;
  }
}

