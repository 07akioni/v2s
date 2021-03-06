# v2s

Vue to script.

Convert `.vue` file's template + script to `.ts|js` file in a treeshakable manner.

> Caveat
>
> The package only transform template + script part of .vue file, style of SFC is not supported.
>
> Vue2 functional template is not supported.
>
> Vue2 + script lang="ts" is not supported.

## Installation

```bash
npm i -D v2s
```

## Usage

```bash
npx v2s path/to/file
```

It will convert `x.vue` to `x.render.ts|js`, `x.script.ts|js` and `x.ts|js` corresponding to the `lang` attribute.

## Option

### `-r, --refactor-vue-import`

Refactor `.vue` import/export statement in `.ts/.js/.vue` files. (Only transformed `.vue` imports will be refactored.)

### `-d, --delete-source`

Delete `.vue` source file after transformation.

### `-vue2, --vue2`

Transform `.vue` file to vue2 API js file.

## Why it exists

If you have a vue library and want to build it in a treeshakable manner, you will always want to keep the original file structure.

For example:

```
- index.ts      index.js  + index.d.ts
- Button.vue => Button.js + Button.d.ts
- Input.vue     Input.js  + Input.d.ts
```

Currently I can think of some ways to do it.

1. rollup + `presereModules=true`: not working, due to `rollup-plugin-vue`, the output is not treeshakable.
2. tsc: not working, it doesn't work with `.vue` files.
3. webpack: not working, can not keep the structure.

I want to use `tsc` to make build the library. So I need a tool to tranform all `.vue` files to `.ts` file and modify all the `.vue` import, export statements inside the library.
