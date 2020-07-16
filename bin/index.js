#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const chalk = require('chalk')
const boxen = require('boxen')
const yargs = require('yargs')
const rimraf = require('rimraf')
const builder = require('xmlbuilder')
const unzipper = require('unzipper')
const pjson = require('../package.json')
const gm = require('gm').subClass({ imageMagick: true })

const TMP_PATH = `_${Math.random().toString(36).substr(2, 9)}`

const FLIPPED = [
    [0x00000000, 0xa0000000, 0xc0000000, 0x60000000],
    [0x80000000, 0xe0000000, 0x40000000, 0x20000000]
]

const TMX_MAP_OPTIONS = {
    version: 1.4,
    tiledversion: '1.4.1',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    type: 'map',
    infinite: false,
}

/**
 * Get tile value with flips and rotations.
 * 
 * @param {Object} tile - Pyxel tile definition
 * @param {number} tile.index - Tile index value
 * @param {number} tile.rot - Tile rotation value
 * @param {boolean} tile.flipX - Tile flipX flag 
 */
const getTile = ({ index, rot, flipX }) => 1 + index + FLIPPED[flipX ? 1 : 0][rot]

/**
 * Encode and compress layer data.
 * 
 * @param {Array<number>} data - Layer data
 */
const encodeLayer = async data => await new Promise(
    (resolve, reject) => zlib.deflate(
        new Uint32Array(data),
        (err, buf) => !err
            ? resolve(buf.toString('base64'))
            : reject(err)
    )
)

/**
 * Convert from *.pyxel to *.tmx format.
 * 
 * @param {string} pyxelMapFile - Input fileanme
 * @param {string} tmxMapFile - Output filename
 */
async function convertPyxel2Tmx(pyxelMapFile, tmxMapFile) {

    const pyxel = fs.createReadStream(pyxelMapFile).pipe(unzipper.Parse({ forceStream: true }))
    const outputFilename = tmxMapFile || `${path.basename(pyxelMapFile, '.pyxel')}.tmx`

    let docData

    !fs.existsSync(TMP_PATH) && fs.mkdirSync(TMP_PATH)

    // Search the archive for the required files.
    for await (const entry of pyxel) {
        const fileName = entry.path
        if (fileName === 'docData.json') {
            const content = await entry.buffer()
            docData = await JSON.parse(content.toString())
        } else if (fileName.match(/tile[0-9]+\.png/)) {
            const newFileName = fileName.replace(/[^0-9]/g, '').padStart(8, '0')
            entry.pipe(fs.createWriteStream(`${TMP_PATH}/${newFileName}.png`))
        } else {
            entry.autodrain()
        }
    }

    if (docData) {
        const {
            canvas: { layers, numLayers, width, height },
            tileset: { numTiles, tilesWide, tileWidth, tileHeight }
        } = docData

        const w = width / tileWidth
        const h = height / tileHeight

        // Create TMX map node.
        const tmx = builder.create('map').att({
            ...TMX_MAP_OPTIONS,
            nextlayerid: numLayers + 1,
            width: w,
            height: h,
            tileheight: tileHeight,
            tilewidth: tileWidth,
        })

        // Add tileset element into TMX node.
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

        // Parse and encode layers.
        await Promise.all(Object.values(layers).reverse().map(
            async ({ alpha, name, hidden, tileRefs }, id) => {
                const layer = new Array(w * h).fill(0)
                Object.keys(tileRefs).map(key => layer[key] = getTile(tileRefs[key]))
                tmx
                    .ele('layer', {
                        id,
                        name,
                        visible: !hidden,
                        opacity: alpha / 255,
                        width: w,
                        height: h
                    })
                    .ele('data', { encoding: 'base64', compression: 'zlib' },
                        await encodeLayer(layer)
                    )
            })
        )

        // Generate tileset from multiple images.
        gm()
            .montage(`${TMP_PATH}/*.png`)
            .tile(`${tilesWide}x`)
            .geometry(`${tileWidth}x${tileHeight}`)
            .background('none')
            .write('tileset.png', err => {
                if (!err) console.log(chalk.greenBright('✔ Written tileset image.'))
                rimraf.sync(TMP_PATH)
            })

        // Write to TMX file.
        try {
            fs.writeFileSync(outputFilename, tmx.end({ pretty: true }), 'utf-8')
            console.log(chalk.greenBright('✔ Written tilemap file.'))
        } catch (e) {
            console.error(chalk.redBright(e))
        }
    } else {
        console.error(chalk.redBright('docData.json not found!'))
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
}))

const options = yargs
    .usage('Usage: -f <filename> -o <filename>')
    .option('f', { alias: 'filename', describe: 'Input PyxelEdit project file in *.pyxel format', type: 'string', demandOption: true })
    .option('o', { alias: 'output', describe: 'Custom filename for output *.tmx file', type: 'string' })
    .example('$0 pyxel2tmx -f map.pyxel')
    .example('$0 pyxel2tmx -f map.pyxel -o output.tmx')
    .epilog('copyright © 2020 Piotr Praga')
    .argv

const { filename, output } = options

fs.access(filename, fs.constants.F_OK, err => err
    ? console.error(chalk.redBright(`${filename} does not exist!`))
    : convertPyxel2Tmx(filename, output)
)
