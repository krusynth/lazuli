# lazuli

![Lazuli](https://raw.githubusercontent.com/wiki/krues8dr/lazuli/img/lazuli.png)

Command line mod installer &amp; manager for Minecraft.

Note: Currently only supports mods downloaded from CurseForge.

## Installation

**Requires Node >= 7.6.0**

1. Install dependencies with `npm install`
2. Add to your executable path with `npm link`

## Usage

### Install mods
Run `lazuli install MODNAME` to install a mod. You can specify more than one mod
by including them after the first one. The  `MODNAME` must exactly match the one
in the url from CurseForge (e.g., `buildcraft`, `tinkers-construct`,
`thaumcraft`, etc).

You can create a `lazuli.config.json` file to list the mods you want to include,
as well as to specify the version of minecraft and give your modpack a name and
version. [See the example for details.](lazuli.config.json.example) This file
can also be a javascript file (.js) or a JSON5 file (.json5). Running `lazuli
install` will then install all of the mods in your config file.

### Package for use
The `lazuli build` command creates packages in the `build` folder for various
targets:

`lazuli build client` creates a folder suitable to use for a local technic or
vanialla + forge installation of the modpack.

`lazuli build server` creates a folder for a server modpack. You should run this
after `lazuli build client` and after you've run the modpack at least once, to
create the necessary configuration files (which will need to be copied back to
the client folder).

`lazuli build api` creates json files which can be used as a static replacement
for the Solder API on a server.

`lazuli build deploy` is the completement to the api command which creates a
zipped package of the client build to store on a server. Again, this follows the
Solder path structure and is suitable to put on a server.

Multiple targets can be specified with this command, but do keep in mind the
prerequisites mentioned above. E.g., you must run the client build first, then
copy the config files, before trying `lazuli build server api deploy`. The
correct order for the build targets will be automatically sorted out.
