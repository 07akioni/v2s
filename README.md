# v2t

Convert `.vue` file to `.ts` file.

## Installation
```bash
npm i -D v2t
```

## Usage
```bash
npx v2t path/to/file
```

It will convert `x.vue` to `x.render.ts|js`, `x.script.ts|js` and `x.ts|js` corresponding to the `lang` attribute.

## Option
### `-r, --rewrite-path`
Rewrite relative `.vue` imports and exports.
### `-d, --delete-source`
Deelete `.vue` source file.

## Why it exists
If you have a vue library and want to build it in a treeshakable manner, you will always want to keep the original file structure.

For example:
```
- index.ts      index.js
- Button.vue => Button.js
- Input.vue     Input.js
```

Currently I can think of some ways to do it.

1. rollup + `presereModules=true`: not working, due to `rollup-plugin-vue`, the output is not treeshakable.
2. tsc: not working, it doesn't work with `.vue` files.
3. webpack: not working, can not keep the structure.

I want to use `tsc` to make build the library. So I need a tool to keep tranform all `.vue` files to `.ts` file and modify all the `.vue` import, export statements inside the library.