const fs = require('fs-extra')
const path = require('path')
const { transformScript } = require('./transform-script')
const { transformVue, transformVue2 } = require('./transform-vue')

async function v2s(filePaths, options = {}) {
  const { deleteSource, refactorVueImport, vue2 } = options
  for (const filePath of filePaths) {
    if (!path.isAbsolute(filePath)) {
      throw new Error('[v2s]: Input file path is not absolute path.')
    }
    if (/\.(js|ts)$/.test(filePath)) {
      const code = (await fs.readFile(filePath)).toString()
      // resolve .ts or .js
      await fs.writeFile(
        filePath,
        transformScript(filePaths, filePath, code, refactorVueImport)
      )
    }
    if (/\.vue$/.test(filePath)) {
      const { dir, name } = path.parse(filePath)
      const code = (await fs.readFile(filePath)).toString()
      const {
        isTs,
        render,
        renderFileName,
        script,
        scriptFileName,
        index
      } = (vue2 ? transformVue2 : transformVue)(
        filePaths,
        filePath,
        code,
        refactorVueImport
      )
      const ext = isTs ? '.ts' : '.js'

      if (script === null) {
        // render and script can be merged
        await fs.writeFile(path.resolve(dir, name + ext), index)
      } else {
        await fs.writeFile(path.resolve(dir, renderFileName + ext), render)
        await fs.writeFile(path.resolve(dir, scriptFileName + ext), script)
        await fs.writeFile(path.resolve(dir, name + ext), index)
      }

      // generate ts
      if (deleteSource) {
        await fs.unlink(filePath)
      }
    }
  }
}

module.exports = v2s
