const path = require('path')
const { parse, compileTemplate } = require('@vue/compiler-sfc')
const { transformScript } = require('./transform-script')

exports.transformVue = function transformVue(include, filePath, code) {
  const { name } = path.parse(filePath)
  const sfcd = parse(code).descriptor
  const isTs = sfcd.script.lang === 'ts'
  const render = compileTemplate({
    source: code,
    // `filename` and `id` is useless since it isn't compiled as `scoped`
    // TODO: create a PR for vue
    filename: '__placeholder__',
    id: '__placeholder__'
  }).code
  const script = transformScript(include, filePath, sfcd.script.content, isTs)
  const renderFileName = `${name}__render`
  const scriptFileName = `${name}__script`
  const index =
    `import { render } from './${renderFileName}'\n` +
    `import script from './${scriptFileName}'\n` +
    '\n' +
    'script.render = render\n' +
    '\n' +
    `export default script\n`
  return {
    script,
    scriptFileName,
    render,
    renderFileName,
    index,
    isTs
  }
}
