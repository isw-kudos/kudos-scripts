/* eslint import/no-commonjs: 0, no-console: 0 */
const {exec} = require('child_process');
const p = require('path');

const getDependencies = require('./deps.js');


function execute(cmd, cwd) {
  return new Promise((resolve, reject) => {
    // console.log(cmd);
    if (cwd) {
      exec(cmd, {cwd}, (error, stdout) => error ? reject(error) : resolve(stdout));
      return;
    }
    exec(cmd, (error, stdout) => error ? reject(error) : resolve(stdout));
  });
}


getDependencies().then((config) => {
  Object.keys(config).forEach((pkg) => {
    const {targets} = config[pkg];

    targets.forEach((target) => {
      const source = p.resolve(target);
      execute(`npm update ${pkg}`, source)
      .then(() => console.log('updated', pkg, 'in', source))
      .catch((err) => console.log('ERROR: ', err));
    });
  });
});
