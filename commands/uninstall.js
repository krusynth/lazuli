'use strict';

const Config = require('../lib/config');
const Uninstall = require('../lib/uninstall');

module.exports = function uninstallCommand(program) {

  program
    .command('uninstall [mods...]')
    .description('Uninstall one or more mods.')
    .action(uninstall);

  function uninstall(args, command) {
    let options = Config(program);
    let uninstaller = new Uninstall(options);
    return uninstaller.init()
    .then(() => uninstaller.run(args))
    .then(files => {
      files.forEach(file => console.log(`Removed ${file}`.green));
    })
    .catch(e => {
      console.warn(e.red.bold);
    })
    .finally(() => uninstaller.shutdown());
  }
};
