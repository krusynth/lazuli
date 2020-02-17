'use strict';

const thenify = require('thenify');
const fs = require('mz/fs');
const ForgeService = require('./forgeService');
const MCVersionsService = require('./mcversionsService');
const path = require('path');
const mkdirr = require('./mkdirr');
const ncp = require('ncp').ncp;
const zipFolder = require('zip-folder');
const aZipFolder = thenify(zipFolder);
const slugify = require('./slugify');

class Build {

  constructor (options) {
    this.options = options;

    this.apiDir = this.options.apidir;
    this.modpackListDir = path.join(this.apiDir, 'modpack');
    this.modpackDir = path.join(this.modpackListDir, this.options.slug);
    this.buildDir = path.join(this.modpackDir, this.options.modversion);
    if(this.options.apikey) {
      this.verifyDir = path.join(this.apiDir, 'verify');
    }
  }

  build(args) {
    let output = {
      minecraft: this.options.mcversion,
      mods: []
    };

    // We chain our promises here.
    let promise = Promise.resolve();

    if(args.includes('api')) {
      console.log('Setting up API.');
      promise = promise.then(()=>this.setupAPI());
    }

    if(args.includes('client')) {
      console.log('Setting up Client build.');
      promise = promise.then(()=>this.setupClient());
    }

    if(args.includes('server')) {
      console.log('Setting up Server build.');
      promise = promise.then(()=>this.setupServer());
    }

    if(args.includes('deploy')) {
      console.log('Setting up Deployment.');
      promise = promise.then(()=>this.setupDeploy());
    }

    return promise;
  }

  /* API Setup */
  setupAPI() {
    return this.setupHtaccess()
      .then(()=>this.setupAPIFiles())
      .catch((err) => {
        console.log(err);
        console.log('Cannot setup API!');
      });
  }

  setupHtaccess() {
    console.log('Setting up .htaccess');
    let htaccess = `AddType 'application/json; charset=UTF-8' .json
DirectoryIndex index.json`;

    return this.writeFile(path.join(this.apiDir, '.htaccess'), htaccess);
  }

  setupAPIFiles() {
    console.log('Setting up API JSON files');
    // We need to setup these files:

    // 1) API Index /api/index.json
    return this.setupIndex()
    // 2) Modpack index /api/mymodname/index.json
    .then(this.setupModIndex.bind(this))
    // 3) Build index /api/mymodname/myversion/index.json
    .then(this.setupVersionIndex.bind(this))
    // 4) Modpack list /api/modpack/index.json
    .then(this.setupModpackList.bind(this))
    //5) API key /api/verify/yourapikey/index.json (if API key specified)
    .then(this.setupVerifyFile.bind(this));
  }

  setupIndex() {
    let api = {
      api: 'Lazuli',
      version: this.options.lazuliVersion,
      stream: 'STABLE'
    }

    return this.writeData(path.join(this.apiDir, 'index.json'), api)
  }

  setupModIndex() {
    let indexFile = path.join(this.modpackDir, 'index.json');

    return fs.exists(indexFile)
    .then((fileExists) => {
      let modpack = {}

      if(fileExists) {
        let modpack = require(fs.realpathSync(indexFile));
      }

      modpack.name = this.options.slug;
      modpack.url = this.options.url || '';
      modpack.display_name = this.options.name;
      modpack.recommended = this.options.modversion;
      modpack.latest = this.options.modversion;
      modpack.builds = modpack.builds || [];

      if(!modpack.builds.includes(this.options.modversion)) {
        modpack.builds.push(this.options.modversion);
      }

      return this.writeData(indexFile, modpack);
    });
  }

  setupVersionIndex() {
    let build = {
      minecraft: this.options.mcversion,
      mods:[]
    };

    let lockfile = require(path.join(process.cwd(), 'lazuli.lock.json'));
    for(let modname in lockfile.mods) {
      build.mods.push({
        name: modname,
        version: lockfile.mods[modname].version,
        md5: lockfile.mods[modname].hash,
        url: lockfile.mods[modname].link
      });
    }

    return this.writeData(path.join(this.buildDir, 'index.json'), build);
  }

  setupModpackList() {
    let modpackListFile = path.join(this.modpackListDir, 'index.json');

    // Append to this if we already have one.
    return fs.exists(modpackListFile)
    .then((fileExists) => {
      let modpackList = {
        modpacks: {}
      };
      if(fileExists) {
        modpackList = require(fs.realpathSync(modpackListFile));
      }

      let modpack = modpackList.modpacks[this.options.slug];

      if(!modpack) {
        modpack = {};
      }

      modpack.name = this.options.slug;
      modpack.url = this.options.url || '';
      modpack.display_name = this.options.name;
      modpack.recommended = this.options.modversion;
      modpack.latest = this.options.modversion;
      modpack.builds = modpack.builds || [];

      if(!modpack.builds.includes(this.options.modversion)) {
        modpack.builds.push(this.options.modversion);
      }

      modpackList.modpacks[this.options.slug] = modpack;

      return this.writeData(modpackListFile, modpackList);
    })
  }

  setupVerifyFile() {
    if(this.options.apikey) {
      let verifyFile = path.join(this.verifyDir, this.options.apikey);
      return fs.exists(verifyFile).then((fileExists) => {
        if(!fileExists) {
          let now = new Date();
          let verify = {
            valid: "Key validated.",
            name: "Lazuli",
            created_at: {
              date: now.toISOString(),
            }
          };

          this.writeData(verifyFile, verify);
        }
      });
    }
  }

  /* Client Setup */
  setupClient() {
    return this.downloadForgeJar(path.join(this.options.clientdir, 'bin'))
      .then(()=>this.copyMods(path.join(this.options.clientdir, 'mods')));
  }

  /* Server Setup */
  setupServer() {
    return this.downloadForgeJar(path.join(this.options.serverdir, 'bin'))
      .then(()=>this.downloadMinecraftJar('server',
        path.join(this.options.serverdir, 'bin')))
      .then(()=>this.copyMods(path.join(this.options.serverdir, 'mods')))
      .then(()=>this.copyConfs(path.join(this.options.serverdir, 'config')));
  }

  downloadMinecraftJar(type, destdir) {
    console.log(`Get Minecraft ${type} jar`);
    let forge = new MCVersionsService(this.options);
    mkdirr(destdir);

    return forge.get(this.options.mcversion, type, destdir);
  }

  downloadForgeJar(destdir) {
    console.log('Get Forge jar');
    let forge = new ForgeService(this.options);
    mkdirr(destdir);
    return forge.get(this.options.mcversion, destdir);
  }

  // eachdir = true/false: use a separate directory for each mod
  copyMods(destdir, eachdir) {
    console.log(`Copying mods to ${destdir}`);
    return new Promise((resolve, reject) => {
      mkdirr(destdir);

      let promises = [];
      let lockfile = require(path.join(process.cwd(), 'lazuli.lock.json'));
      for(let modname in lockfile.mods) {
        let src = lockfile.mods[modname].fullpath;
        // Do we need a separate folder for each mod, as Technic wants?
        let tmpdir = destdir;
        if(eachdir) {
          tmpdir = path.join(destdir, modname);
          mkdirr(tmpdir);
        }
        let dest = path.join(tmpdir, path.basename(src));

        fs.createReadStream(src).pipe(
          fs.createWriteStream(dest)
        );
      }

      resolve();
    });
  }

  // This function currently assumes config files are in build/client.
  copyConfs(destdir) {
    console.log(`Copying config files to ${destdir}.`);
    let clientdir = path.join(this.options.clientdir, 'config');

    return fs.exists(clientdir).then((fileExists) => {
      if(fileExists) {
        mkdirr(destdir);
        return ncp(clientdir, destdir);
      }
      else {
        return Promise.reject(`No client folder at ${clientdir}`);
      }
    });
  }

  /* Setup for deployment */
  setupDeploy() {
    return this.copyMods(path.join(this.options.deploydir, 'mods'), true)
      .then(()=>this.packageClient());
  }

  packageClient() {
    console.log('Zipping up client dir.');
    let destdir = path.join(this.options.deploydir, this.options.slug);
    let destzip = path.join(destdir, slugify(this.options.name) + '.zip');
    mkdirr(destdir);
    return aZipFolder(this.options.clientdir, destzip);
  }

  /* Helpers */
  writeFile(filename, data) {
    // Create the path to the file.
    mkdirr(path.dirname(filename));

    // Write the file as JSON data.
    return fs.writeFile(filename, data);
  }

  writeData(filename, data) {
    return this.writeFile(filename, JSON.stringify(data, null, 4));
  }
}

module.exports = Build;
