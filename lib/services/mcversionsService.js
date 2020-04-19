'use strict';

const fs = require('mz/fs');
const axios = require('axios');
const $ = require('cheerio');
const path = require('path');

class MCVersionsService {
	constructor (options) {
		this.options = options;
		this.url = 'https://mcversions.net/';
	}

	get(version, type, mypath) {
		return axios.get(
			this.url, {responseType: 'text'})
		.then((body) => {
			var jarUrl = this.parsePage(body.data, version, type);

			var filename = path.basename(jarUrl);

			return this.downloadFile(jarUrl, path.join(mypath, filename));
		});
	}

	parsePage(body, version, type) {
		var safeVersion = version.replace(/\./g, '\\.');

		var dom = $.load(body);
		var link = dom(`#${safeVersion} .${type}`);
		var download = link.attr('href');
		return download;
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
}

module.exports = MCVersionsService;
