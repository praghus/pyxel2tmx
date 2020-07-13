# pyxel2tmx [![NPM Version](https://img.shields.io/npm/v/pyxel2tmx.svg?style=flat)](https://www.npmjs.org/package/pyxel2tmx)
Tool for converting tiled maps from `*.pyxel` to `*.tmx` format.

## Getting started
First download and install [ImageMagick](http://www.imagemagick.org/). In Mac OS X, you can simply use [Homebrew](http://mxcl.github.io/homebrew/) and do:

    brew install imagemagick

For windows you can download ImageMagick from [here](https://www.imagemagick.org/script/download.php#windows)

## Installation

```bash
npm i -g pyxel2tmx
```

## Basic Usage

```bash
pyxel2tmx -f filename.pyxel
```
or with custom output filename:
```bash
pyxel2tmx -f filename.pyxel -o tiledmap.tmx
```

## Options

`pyxel2tmx` accepts the following options

- `-f`, `--filename` - Input PyxelEdit project file in `*.pyxel` format
- `-o`, `--output` - Custom filename for output `*.tmx` file