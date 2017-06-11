var CurseforgeRepository = require('../lib/curseforgeRepository');

module.exports = function installCommand(program) {
	'use strict';

	program
		.command('install [mods...]')
		.description('Install one or more mods.')
		.action(function(mods, command) {
			var repo = new CurseforgeRepository({});

			for(var i = 0; i < mods.length; i++) {
				var mod = mods[i];

				repo.get(mod);
			}
		});

};
