# lazuli
Command line mod installer &amp; manager for Minecraft.

Currently only supports downloads from CurseForge.

## Installation

1. Install dependencies with `npm install`
2. Add to your executable path with `npm link`

## Usage

Run `lazuli install MODNAME` to install a mod. You can specify more than one mod
by including them after the first one. The  `MODNAME` must exactly match the one
in the url from CurseForge (e.g., `buildcraft`, `tinkers-construct`,
`thaumcraft`, etc).
