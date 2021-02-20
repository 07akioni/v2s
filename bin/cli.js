#!/usr/bin/env node

const path = require('path')
const { program } = require('commander')

const v2s = require('../src/index')

program
  .option('-d, --delete-source', 'delete .vue source file')
  .option(
    '-r, --refactor-vue-import',
    'refactor .vue import/export statement in .ts/.js files'
  )
  .option('-vue2, --vue2', 'generate vue2 script')
  .parse()

const opts = program.opts()

const cwd = process.cwd()
const filePaths = program.args.map((arg) => {
  return path.resolve(cwd, arg)
})

v2s(filePaths, opts)
