function createImportStmtRegex (options = {}) {
  const {
    ext = [],
    requireRelative = false
  } = options
  if (!ext.length) new RegExp(`import.+from.*('|")(${requireRelative ? `\.` : ''}.*)('|").*(;|\n)`, 'g')
  return new RegExp(`import.+from.*('|")(${requireRelative ? `\.` : ''}.*\.${ext.join('|')})('|").*(;|\n)`, 'g')
}

;[
  `import a from './a.vue'\nconsole.log('hello world')`,
  `import a from './a.vue';\nconsole.log('hello world')`,
  `import a from './a.vue';\nconsole.log('hello world')`,
  `import a from "./a.vue"\nconsole.log('hello world')`,
  `import a from "./a.vue";\nconsole.log('hello world')`,
  `import a from "./a.vue";\nconsole.log('hello world')`,
  `import a from "a.vue"\nconsole.log('hello world')`,
  `import a from "a.vue";\nconsole.log('hello world')`,
  `import a from "a.vue";\nconsole.log('hello world')`,
].forEach(source => {
  console.log(source.match(createImportStmtRegex()))
})