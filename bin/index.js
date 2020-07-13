#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const chalk = require('chalk')
const boxen = require('boxen')
const yargs = require('yargs')
const rimraf = require("rimraf")
const builder = require('xmlbuilder')
const unzipper = require('unzipper')
const pjson = require('../package.json');
const gm = require('gm').subClass({ imageMagick: true })

const UID = () => '_' + Math.random().toString(36).substr(2, 9)

const tmpPath = UID()

const tmxMapOptions = {
    version: 1.4,
    tiledversion: '1.4.1',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    type: 'map',
    infinite: false,
}

const pad = (number, length) => {
    let str = `${number}`
    while (str.length < length) str = `0${str}`
    return str
}

const encodeLayer = async (data) => await new Promise(
    (resolve, reject) => zlib.deflate(
        new Uint32Array(data),
        (err, buf) => !err
            ? resolve(buf.toString('base64'))
            : reject(err)
    )
)

async function convertPyxel2Tmx(pyxelMapFile, tmxMapFile) {

    const pyxel = fs.createReadStream(pyxelMapFile).pipe(unzipper.Parse({ forceStream: true }))
    const outputFilename = tmxMapFile || `${path.basename(pyxelMapFile, '.pyxel')}.tmx`

    let docData

    if (!fs.existsSync(tmpPath)) {
        fs.mkdirSync(tmpPath)
    }

    for await (const entry of pyxel) {
        const fileName = entry.path

        if (fileName === 'docData.json') {
            const content = await entry.buffer()
            docData = await JSON.parse(content.toString())
        } else if (fileName.match(/tile[0-9]+\.png/)) {
            const newFileName = pad(parseInt(fileName.replace(/[^0-9]/g, '')), 8)
            entry.pipe(fs.createWriteStream(`${tmpPath}/${newFileName}.png`))
        } else {
            entry.autodrain()
        }
    }

    if (docData) {
        const {
            canvas: { layers, numLayers, width, height },
            tileset: { numTiles, tilesWide, tileWidth, tileHeight }
        } = docData

        const tmx = builder.create('map').att({
            ...tmxMapOptions,
            nextlayerid: numLayers + 1,
            height: height / tileHeight,
            width: width / tileWidth,
            tileheight: tileHeight,
            tilewidth: tileWidth,
        })

        tmx
            .ele('tileset', {
                firstgid: 1,
                name: 'tiles',
                tilewidth: tileWidth,
                tileheight: tileHeight,
                tilecount: numTiles,
                columns: tilesWide
            })
            .ele('image', {
                source: './tileset.png',
                width: tilesWide * tileWidth,
                height: (1 + Math.round(numTiles / tilesWide)) * tileHeight
            })


        await Promise.all(Object.values(layers).map(
            async ({ alpha, name, hidden, tileRefs }, id) => {
                tmx
                    .ele('layer', {
                        id,
                        name,
                        visible: !hidden,
                        opacity: alpha / 255,
                        height: height / tileHeight,
                        width: width / tileWidth
                    })
                    .ele('data', { encoding: 'base64', compression: 'zlib' }, await encodeLayer(
                        Object.values(tileRefs).map(({ index }) => index > 0 ? index + 1 : 0)
                    ))
            }))

        gm()
            .montage(`${tmpPath}/*.png`)
            .tile(`${tilesWide}x`)
            .geometry(`${tileWidth}x${tileHeight}`)
            .background('none')
            .write(`tileset.png`, (err) => {
                if (!err) console.log(chalk.greenBright('✔ Written tileset image.'))
                rimraf.sync(tmpPath)
            })

        try {
            fs.writeFileSync(outputFilename, tmx.end({ pretty: true }), 'utf-8')
            console.log(chalk.greenBright('✔ Written tilemap file.'))
        } catch (e) {
            console.error(chalk.redBright(e));
        }

    } else {
        console.error('docData.json missing!')
    }
}

const header = chalk.whiteBright.bold.underline(`Pyxel ➔ Tmx converter v${pjson.version}`)
const important = chalk.redBright('IMPORTANT:')
const line1 = chalk.gray('tool for converting tiled maps from "pyxel" to "tmx" format.')
const line2 = chalk.white('"ImageMagic" must be installed for proper operation!')

console.log(boxen(`${header}\n${line1}\n\n${important} ${line2}`, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'gray'
}));

const options = yargs
    .usage('Usage: -f <filename> -o <filename>')
    .option('f', { alias: 'filename', describe: 'Input PyxelEdit project file in *.pyxel format', type: 'string', demandOption: true })
    .option('o', { alias: 'output', describe: 'Custom filename for output *.tmx file', type: 'string' })
    .example('$0 pyxel2tmx -f map.pyxel')
    .example('$0 pyxel2tmx -f map.pyxel -o output.tmx')
    .epilog('copyright © 2020 Piotr Praga')
    .argv;

const { filename, output } = options

fs.access(filename, fs.constants.F_OK, err => err
    ? console.error(chalk.redBright(`${filename} does not exist!`))
    : convertPyxel2Tmx(filename, output)
);
