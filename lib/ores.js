'use strict';

const Install = require('./install');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

class Ores {

  constructor (options) {
    this.options = options;
    this.oreList = {};
    this.ores = {};
    this.density = {};

    this.cofhdir = path.join(options.configdir, 'cofh/world');

    this.modNames = Object.keys(this.options.mods);

    this.init();
    this.initDensity();
  }

  init() {
    let oreList = require('./ores.json');
    let finalOres = {};

    this.oreList[oreList.default] = oreList.ores[oreList.default]

    for(let modName in oreList.ores) {
      if(this.modNames.indexOf(modName) >= 0) {
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

  initDensity() {
    this.density = {
      'default': {},
      disabled: {
        "enabled": "false",
        "distribution": "uniform",
        "generator": {
          "block": null,
          "material": "minecraft:stone",
          "cluster-size": 8
        },
        "cluster-count": 1,
        "min-height": 0,
        "max-height": 16,
      },
      diamond: {
        "distribution": "uniform",
        "generator": {
          "block": null,
          "material": "minecraft:stone",
          "cluster-size": 8
        },
        "cluster-count": 1,
        "min-height": 0,
        "max-height": 16,
      },
      iron: {
        "distribution": "uniform",
        "generator": {
          "block": null,
          "material": "minecraft:stone",
          "cluster-size": 9
        },
        "cluster-count": 20,
        "min-height": 0,
        "max-height": 64,
      },
      coal: {
        "distribution": "uniform",
        "generator": {
          "block": null,
          "material": "minecraft:stone",
          "cluster-size": 17
        },
        "cluster-count": 20,
        "min-height": 0,
        "max-height": 128,
      },
      bigdig: {
        "distribution": "uniform",
        "generator": {
          "block": null,
          "material": "minecraft:stone",
          "cluster-size": 20
        },
        "cluster-count": 20,
        "min-height": 5,
        "max-height": 95,
      },
      custom: {}
    }
  }

  setup() {
    let result = true;

    if(
      this.modNames.indexOf('cofh-world') == -1 ||
      this.modNames.indexOf('cofhcore') == -1
    ) {
      console.log('The cofhcore and cofh-world mods are required for ore management. Please add these to your lazuli.config file and install them.');
      result = false;
    }

    if(!fs.existsSync(path.join(this.cofhdir, 'config.cfg'))) {
      console.log('Please run the modpack with cofhcore and cofh-world at least once to generate the necessary configuration files.');
      result = false;
    }

    return Promise.resolve(result);
  }

  frequency () {
    return new Promise(async (resolve, reject) => {
      let answers = {};

      for(let ore in this.ores) {
        answers[ore] = {};

        if(this.ores[ore].length > 1) {
          let name = `ignore---${ore}`;
          let message = capitalize(ore) + ' is provided by multiple mods. Choose from mods below to DISABLE this ore for that mod.';
          let disabled = [];
console.log(1);

          disabled = await prompts({
            type: 'multiselect',
            name: name,
            message: message,
            choices: this.ores[ore].map( elm => ({title: elm, value: elm}) ),
            validate: s => s && s.length
          });
console.log(2, disabled);
          if(disabled[name] && disabled[name].length) {
            disabled[name].forEach( mod => {
              answers[ore][mod] = 'disabled';
            });
          }
        }
console.log(3);
        for(let i = 0; i < this.ores[ore].length; i++) {
          let mod = this.ores[ore][i];
          let name = `density---${ore}---${mod}`;
console.log(4);
          if(!answers[ore][mod]) {
            let result = await prompts({
              type: 'select',
              name: name,
              message: `Select density for ${ore} (${mod}).`,
              choices: Object.keys(this.density).map( elm => ({title: elm, value: elm}) ),
              validate: s => s && s.length
            });
            answers[ore][mod] = result[name];
          }
console.log(5);
          // For custom densities, we need to fill in the blanks.
          if(answers[ore][mod] == 'custom') {
            answers[ore][mod] = {};
          }
        }
      }

      console.log(answers);
      resolve();
    });
  }
}

module.exports = Ores;
