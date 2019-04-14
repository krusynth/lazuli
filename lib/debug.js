'use strict';

const Install = require('./install');
const inquirer = require('inquirer');

class Debug {
  constructor (options) {
    this.options = options;
    this.install = new Install(options);
  }

  // Due to dependencies earlier in the list, we can't do a "standard" binary tree"
  // Given, say, 25 mods, we run:
  //                            1-12
  //                 Y: 1-6                       N: 1-19
  //         Y: 1-3                    N: 1-9
  //    Y: 1-2      N: 1-3*      Y: 1-7  N: 1-11
  // Y: 1*  N: 1-2*            Y: 1-7*

  run(mods) {
    console.log('Open the minecraft launcher now.');

    mods = Object.entries(mods);

    let chunk = Math.ceil(mods.length / 2);
    let set = chunk;

    this.checkRange(mods, set, chunk).then( set => {
      console.log('***Final set 1-' + (set+1) + '***');
    });

    return Promise.resolve();
  }

  checkRange(mods, set, chunk) {
    console.log('Checking 1-'+(set+1));
    let group = mods.slice(0, set);
    return this.checkGroup(group).then( (result) => {
      // if we have a chunk of 1, we're done.
      if(chunk <= 1) {
        // If there's an error, this is the resulting set.
        // Otherwise, it's the *previous* loop's set.
        if(!result['error']) {
          set = set - chunk;
        }
        return set;
      }

      // Otherwise, we keep going.
      if(result['error']) {
        chunk = Math.ceil(chunk/2);
        set = set - chunk;
      }
      else {
        chunk = Math.ceil(chunk/2);
        set = set + chunk;
      }

      // Recursively try again.
      return this.checkRange(mods, set, chunk);
    })
  }

  checkGroup(mods) {
    this.install.clearMods();

    return this.install.run(mods).then( (result) => {
      console.log('Run the modpack now. ');
      return inquirer.prompt([
        {
          'name': 'error',
          'message': 'Was there an error?',
          'type': 'confirm'
        }
      ])
    })
  }
}

module.exports = Debug;