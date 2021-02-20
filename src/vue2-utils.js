const vue2Compiler = require('vue-template-compiler')
const stripWith = require('vue-template-es2015-compiler')

function transform(code) {
  const result = vue2Compiler.compile(code)

  function transformRender(c) {
    return (
      stripWith(`function __v2s_render () { ${c} }`) +
      '\n__v2s_render._withStripped = true\n'
    )
  }

  function transformStaticRender(c) {
    return stripWith(`function _ () { ${c} }`)
  }

  const transformResult = {
    render: transformRender(result.render),
    staticRenderFns: `const __v2s_staticRenderFns = [${result.staticRenderFns
      .map(transformStaticRender)
      .join(',\n')}]`
  }

  return transformResult
}

// there can be bugs, however i just want to make it work
function extractScript(code) {
  const script = code
    .replace(/(.|\s)*<script>/, '')
    .replace(/<\/script>(.|\s)*/, '')
    .trim()
  if (/export\s+default /.test(script)) return script
  return script + 'export default {}'
}

function extractTemplate(code) {
  return code
    .replace(/(.|\s)*<template>/, '')
    .replace(/<\/template>(.|\s)*/, '')
    .trim()
}

exports.transformVue2Tpl = transform
exports.extractScript = extractScript
exports.extractTemplate = extractTemplate
