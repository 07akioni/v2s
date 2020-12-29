#!/usr/bin/env node

const fs = require('fs-extra')
const path = require('path')
const { program } = require('commander')
const {
  parse,
  compileTemplate
} = require('@vue/compiler-sfc')

program
  .option('-d, --delete-source', 'delete .vue source file')
  .option('-r, --rewrite-ports', 'rewrite relative .vue imports and exports')
  .parse()

const {
  deleteSource,
  rewritePorts
} = program.opts()

const cwd = process.cwd()
const filePaths = program.args.map(arg => {
  return path.resolve(cwd, arg)
})

const rewritePortsRegex = createPortStmtRegex({
  ext: ['vue'],
  requireRelative: true
})

;(async () => {
  for (const filePath of filePaths) {
    if (
      rewritePorts &&
      /\.(js|ts|vue)$/.test(filePath)
    ) {
      console.log(filePath)
      const source = (await fs.readFile(filePath)).toString()
      const code = source.replace(rewritePortsRegex, importStmt => importStmt.replace(/\.vue/, ''))
      // resolve .ts or .js
      await fs.writeFile(filePath, code)
    }
    if (/\.vue$/.test(filePath)) {
      const {
        dir,
        name
      } = path.parse(filePath)
      const source = (await fs.readFile(filePath)).toString()
      const sfcd = parse(source).descriptor
      const isTs = sfcd.script.lang === 'ts'
      const renderFilename = name + '.render' + (isTs ? '.ts' : '.js')// filename.replace(/\.vue$/, '.render' + (isTs ? '.ts' : '.js'))
      const renderFilePath = path.resolve(dir, renderFilename)
      const render = compileTemplate({
        source,
        filename: renderFilename,
        id: renderFilename
      }).code
      await fs.writeFile(renderFilePath, render)
      const scriptFilename = name + '.script' + (isTs ? '.ts' : '.js')
      const scriptFilePath = path.resolve(dir, scriptFilename)
      const script = sfcd.script.content.trim() + '\n'
      await fs.writeFile(scriptFilePath, script)
      const indexPath = filePath.replace(/\.vue$/, isTs ? '.ts' : '.js')
      await fs.writeFile(indexPath, `import { render } from './${name}.render'
import script from './${name}.script'

export default Object.assign(script, { render })
`)
      // generate ts
      if (deleteSource) {
        await fs.unlink(filePath)
      }
    }
  }
})()

function createPortStmtRegex (options = {}) {
  const {
    ext = [],
    requireRelative = false
  } = options
  return new RegExp(`(import|export)(.+from)?.*('|")(${requireRelative ? `\\.` : ''}.*(${ext.length ? `\\.` : ''}${ext.join('|')}))('|").*(;|\n|$)`, 'g')
}
