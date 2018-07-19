#!/usr/bin/env node

/* eslint import/no-commonjs: 0, no-console: 0 */
const {exec} = require('child_process');
const os = require('os');
const p = require('path');

const getDependencies = require('./deps.js');

function pickBetweenOS(linux, win) {
  return os.type() === 'Windows_NT' ? win : linux;
}

function execute(cmd) {
  return new Promise((resolve, reject) => {
    // console.log(cmd);
    exec(cmd, (error, stdout) => error ? reject(error) : resolve(stdout));
  });
}

function deleteFolder(folder) {
  return execute(pickBetweenOS(`rm -rf ${folder}`, `rmdir /S /Q ${folder}`));
  // .then(() => console.log(`deleted folder: ${folder}`));
}

getDependencies().then((config) => {
  Object.keys(config).forEach((submodule) => {
    const {path, targets} = config[submodule];
    const source = p.resolve(submodule + path);

    //delete any existing built so we dont get residual files
    deleteFolder(source)
    .catch(() => {/**/})
    //build new
    .then(() => execute(`cd ${submodule} && npm run postinstall && cd ..`))
    // .then(console.log)
    .then(() => {
      targets.forEach((target) => {
        const dest = p.resolve(`${target}/node_modules/${submodule}${path}`);
        if(!dest || dest.length===1)
          return console.error('Oh boy! We nearly deleted:', dest);

        deleteFolder(dest)
        .catch(err => console.error('Delete', err, target, submodule))
        .then(() => {
          const copyCmd = pickBetweenOS('cp -rf ', 'Xcopy /E /I /Y ');
          return execute(`${copyCmd} ${source} ${dest}`);
        })
        .then(() => console.log(`copied ${submodule} to ${target}`), err => console.error('Copy', err, target, submodule));
      });
    })
    .catch(err => console.error('Error in dev:deps', err));
  });
});
