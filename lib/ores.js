'use strict';

const inquirer = require('inquirer');

class Ores {

  constructor (options) {
    this.options = options;
    this.oreList = {};
    this.ores = {};

    this.setup();
  }

  setup() {
  	let modList = Object.keys(this.options.mods);
    let oreList = require('./ores.json');
    let finalOres = {};

    this.oreList[oreList.default] = oreList.ores[oreList.default]

    for(let modName in oreList.ores) {
    	if(modList.indexOf(modName) >= 0) {
    		this.oreList[modName] = oreList.ores[modName];
    		for(let ore in oreList.ores[modName]) {
    			if(typeof(this.ores[ore]) === 'undefined') {
    				this.ores[ore] = [];
    			}
    			this.ores[ore].push(modName);
    		}
    	}
    }

  }

  manage () {
  	return new Promise((resolve, reject) => {
  		let questions = [];
  		for(let ore in this.ores) {
  			if(this.ores[ore].length > 1) {
  				questions.push({
						type: 'checkbox',
						name: ore,
						message: 'Ore: ' + ore,
						choices: this.ores[ore],
						default: this.ores[ore]
  				});
  			}
  		}

  		if(questions.length == 0) {
  			resolve();
  		}

  		console.log('Duplicate ores detected. Uncheck to disable that ore:')
			return inquirer.prompt(questions)
			.then((results) => {
				console.log(results);
				resolve();
			});
	  });
  }
}

module.exports = Ores;
