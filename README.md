# pyxel2tmx [![NPM Version](https://img.shields.io/npm/v/pyxel2tmx.svg?style=flat)](https://www.npmjs.org/package/pyxel2tmx)
Tool for converting tiled maps from [PyxelEdit](https://pyxeledit.com/) to [Tiled Map Editor](https://www.mapeditor.org/) format.

## Getting started
First download and install [ImageMagick](http://www.imagemagick.org/). In Mac OS X, you can simply use [Homebrew](http://mxcl.github.io/homebrew/) and do:

    brew install imagemagick

For windows you can download ImageMagick from [here](https://www.imagemagick.org/script/download.php#windows)

## Installation

```bash
npm i -g pyxel2tmx
```
### OR
If you are running npm 5.2.0 or higher, you can use `pyxel2tmx` with `npx` without installation:

```bash
npx pyxel2tmx -f filename.pyxel
```

## Basic Usage

```bash
# default
pyxel2tmx -f filename.pyxel

# or with custom output filename
pyxel2tmx -f filename.pyxel -o tiledmap.tmx
```

## Options

`pyxel2tmx` accepts the following options:

- `-f`, `--filename` - Input PyxelEdit project file in `*.pyxel` format
- `-o`, `--output` - Custom filename for output `*.tmx` file

## License

[MIT licensed](./LICENSE).
