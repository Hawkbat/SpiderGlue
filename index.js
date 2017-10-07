#!/usr/bin/env node
let findUp = require('find-up')
let glob = require('glob')
let cheerio = require('cheerio')
let pretty = require('pretty')
let fs = require('fs-extra')
let path = require('path')

let configPath = findUp.sync('spiderglue.json')
if (!configPath) throw new Error("No valid spiderglue.json file found")
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

let srcPath = path.resolve(config.src || "./")
let dstPath = path.resolve(config.dst || "./")

console.log('Source: ' + srcPath)
console.log('Destination: ' + dstPath)

function replaceImports(htmlPath, $) {
	$('link[rel="import"]').each((i, ele) => {
		let importPath = ele.attribs['href']
		if (importPath.startsWith('/')) {
			importPath = path.join(srcPath, importPath)
		} else {
			importPath = path.join(path.dirname(htmlPath), importPath)
		}
		if (fs.existsSync(importPath)) {
			let $2 = cheerio.load(fs.readFileSync(importPath, 'utf8'), { decodeEntities: false })
			replaceImports(importPath, $2)
			$(ele).replaceWith($2.html())
		} else {
			console.warn('Invalid import path: ' + importPath + ' (in ' + relPath + ')')
		}
	})
}

let htmlPaths = glob.sync(srcPath + "/**/!(*.part).html")
for (let htmlPath of htmlPaths) {
	let relPath = path.relative(srcPath, htmlPath)
	let outPath = path.join(dstPath, relPath)

	let $ = cheerio.load(fs.readFileSync(htmlPath, 'utf8'), { decodeEntities: false })
	replaceImports(htmlPath, $)
	fs.ensureFileSync(outPath)
	fs.writeFileSync(outPath, pretty($.html(), { ocd: true }), 'utf8')
	console.log('Wrote: ' + relPath)
}