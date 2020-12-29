#!/usr/bin/env node

const path = require('path')
const { program } = require('commander')

const { run } = require('../src/run')

program
  .option('-d, --delete-source', 'delete .vue source file')
  .option('-r, --refactor', 'refactor .vue import/export statement in .ts/.js files')
  .parse()

const opts = program.opts()

const cwd = process.cwd()
const filePaths = program.args.map(arg => {
  return path.resolve(cwd, arg)
})

run(
  filePaths,
  opts
)