rm -rf test/e2e/basic-js/src/*.js
node bin/cli.js test/e2e/basic-js/**/*

rm -rf test/e2e/basic-mixed/src/*.{js,ts}
node bin/cli.js test/e2e/basic-mixed/**/*

rm -rf test/e2e/basic-ts/src/*.ts
node bin/cli.js test/e2e/basic-ts/**/*

rm -rf test/e2e/basic-vue/*.js
node bin/cli.js test/e2e/basic-vue/* # **/* will create nothing...


rm -rf test/e2e/basic-vue-ts/*.ts
node bin/cli.js test/e2e/basic-vue-ts/*

rm -rf test/e2e/basic-vue2/*.js
node bin/cli.js -vue2 test/e2e/basic-vue2/*

rm -rf test/e2e/hoisted/*.js
node bin/cli.js test/e2e/hoisted/*

rm -rf test/e2e/hoisted-vue2/*.js
node bin/cli.js -vue2 test/e2e/hoisted-vue2/*