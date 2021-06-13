const path = require('path')
const { parse, compileTemplate } = require('@vue/compiler-sfc')

const { transformScript } = require('./transform-script')
const t = require('@babel/types')
const parser = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { default: generate } = require('@babel/generator')

const {
  transformVue2Tpl,
  extractTemplate,
  extractScript
} = require('./vue2-utils')

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

  /**
   * @type Array<import('@babel/types').ImportDeclaration>
   */
  const renderImports = []
  /**
   * @type Array<import('@babel/types').ImportDeclaration>
   */
  const scriptImports = []

  /**
   * @type import('@babel/types').FunctionDeclaration
   */
  let renderFunctionNode

  // remove all imports & exported render function
  traverse(renderAst, {
    ImportDeclaration(path) {
      renderImports.push(path.node)
      path.remove()
    },
    ExportNamedDeclaration(path) {
      renderFunctionNode = path.node.declaration
      path.remove()
    }
  }) // currently render.js is not empty, for it may contain hoisted node

  const scriptAst = parser.parse(script, {
    sourceType: 'module',
    plugins: isTs ? ['typescript'] : undefined
  })

  traverse(scriptAst, {
    ImportDeclaration(path) {
      scriptImports.push(path.node)
      path.remove()
    }
  })

  const mergedImports = []
  let vueImport = null
  for (const importStmt of renderImports.concat(scriptImports)) {
    if (importStmt.source.value === 'vue') {
      if (vueImport === null) {
        vueImport = importStmt
      } else {
        vueImport.specifiers.push(...importStmt.specifiers)
      }
    } else {
      mergedImports.push(importStmt)
    }
  }
  if (vueImport !== null) {
    mergedImports.push(vueImport)
  }

  let renderFunctionCanBeMerged = true

  traverse(scriptAst, {
    Program(path) {
      if (mergedImports.length) {
        mergedImports.forEach((renderImport) =>
          path.node.body.unshift(renderImport)
        )
        mergedImports.length = 0
      }
      const lastImport = path
        .get('body')
        .filter((p) => p.isImportDeclaration())
        .pop()
      // add hoisted nodes to script ast
      if (lastImport) lastImport.insertAfter(renderAst.program.body)
      else {
        // in case there is no render import, which may be impossible
        path.get('body')[0].insertBefore(renderAst.program.body)
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

// transform vue2 do not support typescript
exports.transformVue2 = function transformVue2(
  include,
  filePath,
  code,
  refactorVueImport
) {
  const { name } = path.parse(filePath)
  const templateCode = extractTemplate(code)
  const scriptCode = extractScript(code)
  const {
    render, // __v2s_render
    staticRenderFns // __v2s_staticRenderFns
  } = transformVue2Tpl(templateCode)

  const script = transformScript(
    include,
    filePath,
    scriptCode,
    refactorVueImport,
    false
  )

  const renderCode = render + '\n' + staticRenderFns

  // content:
  // function __v2s_render () {...}
  // const __v2s_staticRenderFns = [...]
  const renderAst = parser.parse(renderCode, {
    sourceType: 'module'
  })

  const scriptAst = parser.parse(scriptCode, {
    sourceType: 'module'
  })

  let renderFunctionCanBeMerged = true

  traverse(scriptAst, {
    ExportDefaultDeclaration(path) {
      // export default defineComponent({})
      const { declaration } = path.node
      // export default {}
      if (declaration.type === 'ObjectExpression') {
        declaration.properties.push(
          t.objectProperty(
            t.identifier('render'),
            t.identifier('__v2s_render')
          ),
          t.objectProperty(
            t.identifier('staticRenderFns'),
            t.identifier('__v2s_staticRenderFns')
          )
        )
        return
      }
      // others, not supported
      renderFunctionCanBeMerged = false
    }
  })

  if (renderFunctionCanBeMerged) {
    traverse(scriptAst, {
      Program(path) {
        const lastImport = path
          .get('body')
          .filter((p) => p.isImportDeclaration())
          .pop()
        if (lastImport) lastImport.insertAfter(renderAst.program.body)
        else {
          path.get('body')[0].insertBefore(renderAst.program.body)
        }
      }
    })
    return {
      script: null,
      scriptFileName: null,
      render: null,
      renderFileName: null,
      index: generate(scriptAst).code,
      isTs: false
    }
  } else {
    // complex export
    const renderFileName = `${name}__render`
    const scriptFileName = `${name}__script`
    const index =
      `import { __v2s_staticRenderFns, __v2s_render } from './${renderFileName}'\n` +
      `import script from './${scriptFileName}'\n` +
      '\n' +
      'script.render = __v2s_render\n' +
      'script.staticRenderFns = __v2s_staticRenderFns\n' +
      '\n' +
      `export default script\n`
    return {
      script,
      scriptFileName,
      render: `${renderCode}\nexport { __v2s_staticRenderFns, __v2s_render }\n`,
      renderFileName,
      index,
      isTs: false
    }
  }
}
