'use strict';

const fs = require('fs');
const path = require('path');
const HttpEngine = require('./HttpEngine');
const $ = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

/*
 * Cloudscraper implementation to get around CloudFlare restrictions.
 */
module.exports = class PuppeteerEngine extends HttpEngine {
  browser = null;
  cookieFile = '.lazuli.cookies';
  cookies = null;

  async init(args) {
    args = args || {};
    if(typeof args.headless === 'undefined') {
      args.headless = false;
    }
    this.browser = await puppeteer.launch({headless: args.headless});
    return true;
  }

  async shutdown() {
    return this.browser.close();
  }

  async storeCookies(page) {
    this.cookies = await page.cookies();

    fs.writeFileSync(this.cookieFile, JSON.stringify(this.cookies, null, 2));
    console.log('saving cookies');
  }

  async loadCookies(page) {
    if (!this.cookies && fs.existsSync(this.cookieFile)) {
      console.log('loading cookies');
      this.cookies = JSON.parse(fs.readFileSync(this.cookieFile));
    }

    if(this.cookies) {
      await page.setCookie(...this.cookies);
    }
  }

  /*
   * @return Promise(<text>)
   */
  async get(url, options) {
    options = options || {};
    options.temp = options.temp || this.tmpDir();

    let pg = await this.browser.newPage();
    this.loadCookies(pg);

    let once = false;

    await pg.goto(url);
    await pg.waitFor(150);
    // await pg.screenshot({path: '~/Desktop/curse.png'});
    let body = await pg.evaluate(() => document.body.innerHTML);

    let title = $.load(body)('h1').first();

    if(title.text().trim() === 'One more step') {
      console.log("A Capcha was encountered. Press enter when complete.");
      await await new Promise((resolve, reject) => {
        process.stdin.once("data", async () => {
          await this.storeCookies(pg);
          resolve();
        });
      });
      process.stdin.pause();
      let body = await this.get(url);
    }

    let pages = await this.browser.pages();
    for(let i = 0; i < pages.length; i++) {
      pages[i].close();
    }

    return body;
  }

  /*
   * @return Promise()
   */
  async download(url, dest, options) {
    options = options || {wait: 5000};
    options.temp = options.temp || this.tmpDir();

    return new Promise( async(resolve, reject) => {

      let pg = await this.browser.newPage();
      this.loadCookies(pg);
      await pg._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: options.temp});

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
        await pg.waitFor(options.wait);

        // We should only have one file in our new temp dir.
        let files = fs.readdirSync(options.temp);

        fs.renameSync(path.join(options.temp, files[0]), dest);
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

