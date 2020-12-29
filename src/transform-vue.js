const path = require('path')
const {
  parse,
  compileTemplate
} = require('@vue/compiler-sfc')
const {
  transformScript
} = require('./transform-script')

exports.transformVue = function transformVue (
  include,
  filePath,
  code,
) {
  console.log(filePath)
  const {
    name,
    base
  } = path.parse(filePath)
  const sfcd = parse(code).descriptor
  const isTs = sfcd.script.lang === 'ts'
  const render = compileTemplate({
    source: code,
    filename: base,
    id: base
  }).code
  const script = transformScript(include, filePath, sfcd.script.content, isTs)
  const renderFileName = `${name}__render`
  const scriptFileName = `${name}__script`
  const index =
    `import { render } from './${renderFileName}'\n` +
    `import script from './${scriptFileName}'\n` +
    '\n' +
    `export default Object.assign(script, { render })\n`
  return {
    script,
    scriptFileName,
    render,
    renderFileName, 
    index,
    isTs
  }
}