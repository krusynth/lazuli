var CurseforgeRepository = require('../lib/curseforgeRepository');

module.exports = function installCommand(program) {
	'use strict';

	program
		.command('install [mods...]')
		.description('Install one or more mods. If a list isn\'t given, installs from lazuli.json')
		.action(function(mods, command) {
			console.log('command: ' + command);
			console.log('Mods', mods);

			var repo = new CurseforgeRepository({});

			for(var i = 0; i < mods.length; i++) {
				var mod = mods[i];

				repo.get(mod);
			}
		});

};
