const path = require('path')
const { parse, compileTemplate } = require('@vue/compiler-sfc')
const { transformScript } = require('./transform-script')
const t = require('@babel/types')
const parser = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { default: generate } = require('@babel/generator')

// for basic patter like
// export default defineComponent({}) and export default {}
// we merge the render function with the object together

// for other case, we should still split codes to different files, eg.
// export (() => defineComponent({}))()
exports.transformVue = function transformVue(
  include,
  filePath,
  code,
  refactorVueImport
) {
  const { name } = path.parse(filePath)
  const sfcd = parse(code).descriptor
  const isTs = sfcd.script.lang === 'ts'
  const render = compileTemplate({
    source: sfcd.template.content,
    // `filename` and `id` is useless since it isn't compiled as `scoped`
    // TODO: create a PR for vue
    filename: '__placeholder__',
    id: '__placeholder__'
  }).code
  const script = transformScript(
    include,
    filePath,
    sfcd.script.content,
    refactorVueImport,
    isTs
  )

  const renderAst = parser.parse(render, {
    sourceType: 'module',
    plugins: isTs ? ['typescript'] : undefined
  })

  const renderImports = []

  /**
   * @type import('@babel/types').FunctionDeclaration
   */
  let renderFunctionNode

  traverse(renderAst, {
    ImportDeclaration(path) {
      renderImports.push(path.node)
      path.remove()
    },
    ExportNamedDeclaration(path) {
      renderFunctionNode = path.node.declaration
      path.remove()
    }
  }) // currently render.js is empty

  const scriptAst = parser.parse(script, {
    sourceType: 'module',
    plugins: isTs ? ['typescript'] : undefined
  })

  let renderFunctionCanBeMerged = true

  traverse(scriptAst, {
    Program(path) {
      if (renderImports.length) {
        renderImports.forEach((renderImport) =>
          path.node.body.unshift(renderImport)
        )
        renderImports.length = 0
      }
    },
    ExportDefaultDeclaration(path) {
      // export default defineComponent({})
      const { declaration } = path.node
      const funcExpr = t.functionExpression(
        renderFunctionNode.id,
        renderFunctionNode.params,
        renderFunctionNode.body,
        renderFunctionNode.generator,
        renderFunctionNode.async
      )
      if (declaration.type === 'CallExpression') {
        if (
          declaration.callee.name === 'defineComponent' &&
          declaration.arguments.length === 1
        ) {
          if (declaration.arguments[0].type === 'ObjectExpression') {
            declaration.arguments[0].properties.push(
              t.objectProperty(t.identifier('render'), funcExpr)
            )
            return
          }
        }
      }
      // export default {}
      else if (declaration.type === 'ObjectExpression') {
        declaration.properties.push(
          t.objectProperty(t.identifier('render'), funcExpr)
        )
        return
      }
      // others, not supported
      renderFunctionCanBeMerged = false
    }
  })

  if (renderFunctionCanBeMerged) {
    return {
      script: null,
      scriptFileName: null,
      render: null,
      renderFileName: null,
      index: generate(scriptAst).code,
      isTs
    }
  } else {
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
}
