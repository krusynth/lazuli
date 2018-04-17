# lazuli
Command line mod installer &amp; manager for Minecraft.

Note: Currently only supports mods downloaded from CurseForge.

## Installation

**Requires Node >= 7.6.0**

1. Install dependencies with `npm install`
2. Add to your executable path with `npm link`

## Usage

Run `lazuli install MODNAME` to install a mod. You can specify more than one mod
by including them after the first one. The  `MODNAME` must exactly match the one
in the url from CurseForge (e.g., `buildcraft`, `tinkers-construct`,
`thaumcraft`, etc).

You can create a `lazuli.config.json` file to list the mods you want to include,
as well as to specify the version of minecraft and give your modpack a name and
version. [See the example for details.](lazuli.config.json.example) This file
can also be a javascript file (.js) or a JSON5 file (.json5). Running `lazuli
install` will then install all of the mods in your config file.
