

module.exports = function uninstallCommand(program) {
  'use strict';

  program
    .command('uninstall <mods...>')
    .description('Uninstall one or more mods.')
    .action(function(args, command) {
      // Merge our command line arguments to override our config file.
      let options = Object.assign(program.conf,
        // Remove undefined options using the JSON twiddle.
        JSON.parse(JSON.stringify(program.opts())));

      let mods = args;

      if(mods && mods.length > 0) {
        let repo = new CurseforgeRepository(options);
        repo.setup().then( () => {
          for(let mod of mods) {
            repo.remove(mod)
              .then(() => {
                console.log(`Unistalled ${mod}`);
              })
              .catch((err) => {
                console.warn(err);
              });
          }
        });
      }
    });

};
