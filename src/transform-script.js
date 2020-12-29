const path = require('path')
const parser = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { default: generate } = require('@babel/generator')

const vueExtRegex = /\.vue$/

function refactorSource(include, dir, source) {
  // if it is a relative .vue import/export
  if (vueExtRegex.test(source) && source[0] === '.') {
    const sourcePath = path.resolve(dir, source)
    if (include.includes(sourcePath)) {
      // erase .vue ext
      // import x from './x.vue' =>
      // import x from './x'
      return source.replace(vueExtRegex, '')
    }
  }
  return source
}

exports.transformScript = function transformScript(
  include,
  filePath,
  code,
  isTs
) {
  const { dir } = path.parse(filePath)
  isTs = isTs === undefined ? filePath.endsWith('.ts') : isTs
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: isTs ? ['typescript'] : undefined
  })
  traverse(ast, {
    ImportDeclaration(path) {
      // if in included files
      // rewrite .vue exts
      path.node.source.value = refactorSource(
        include,
        dir,
        path.node.source.value
      )
    },
    CallExpression(path) {
      if (path.node.callee.type === 'Import') {
        // @ts-ignore
        path.node.arguments[0].value = refactorSource(
          include,
          dir,
          // @ts-ignore
          path.node.arguments[0].value
        )
      }
    },
    ExportNamedDeclaration(path) {
      if (path.node.source) {
        path.node.source.value = refactorSource(
          include,
          dir,
          path.node.source.value
        )
      }
    },
    ExportAllDeclaration(path) {
      path.node.source.value = refactorSource(
        include,
        dir,
        path.node.source.value
      )
    }
  })
  return generate(ast).code
}
