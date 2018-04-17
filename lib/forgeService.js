'use strict';

const fs = require('mz/fs');
const axios = require('axios');
const $ = require('cheerio');
const path = require('path');

class ForgeService {
	constructor (options) {
		this.options = options;
	}

	forgeUrl(mcversion) {
		return `https://files.minecraftforge.net/maven/net/minecraftforge/forge/index_${mcversion}.html`;
	}

	get(version, mypath) {
		return axios.get(
			this.forgeUrl(version), {responseType: 'text'})
		.then((body) => {
			var jarUrl = this.parsePage(body.data);
			jarUrl = this.cleanForgeUrl(jarUrl);

			return this.downloadFile(jarUrl, path.join(mypath, 'modpack.jar'));
		});
	}

	parsePage(body) {
		var dom = $.load(body);
		var rows = dom('table.download-list tbody tr');
		var download;

		for(let i = 0; i < rows.length; i++) {
			let row = $(rows[i]);

			let links = row.find('.download-files li a');

			for(let j = 0; j < links.length; j++) {
				let link = $(links[j]);

				// Look for the "Universal" download.
				if(link.text().trim().match('Universal')) {
					download = link.attr('href');
					return download;
				}
			}
		}
	}

	cleanForgeUrl(url) {
		var args = this.getUrlParams(url);
		return args.url;
	}

	getUrlParams(url) {
		var query = url.split('?')[1];
		var parts = query.split('&');
		var args = {}
		for(let i = 0; i < parts.length; i++) {
			let arg = parts[i].split('=');
			args[arg[0]] = arg[1];
		}
		return args;
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

module.exports = ForgeService;
