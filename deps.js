/* eslint import/no-commonjs: 0, no-console: 0 */
const path = require('path');
const fs = require('fs');

const CORE = '.';
// const COMMON = 'kudos-common';
// const BOARDS = 'kudos-boards-service';
// const LICENCE = 'kudos-licence-service';
// const NOTIFICATION = 'kudos-notification-service';
// const PROVIDER = 'kudos-provider-service';
// const USER = 'kudos-user-service';

const config = {
  // [COMMON]: {path: '/dist', targets: [CORE, BOARDS, USER, PROVIDER, NOTIFICATION, LICENCE]},
  // [LICENCE]: {path: '/exports/dist', targets: [CORE]},
  // [NOTIFICATION]: {path: '/exports/dist', targets: [CORE]},
  // [PROVIDER]: {path: '/exports/dist', targets: [CORE, USER, BOARDS, NOTIFICATION]},
  // [USER]: {path: '/exports/dist', targets: [CORE, BOARDS]},
};

function readDir(folder) {
  return new Promise((resolve, reject) => {
    fs.readdir(folder, (err, files) => err ? reject(err) : resolve(files));
  });
}

function fileStats(file) {
  return new Promise((resolve, reject) => {
    fs.stat(file, (err, stats) => err ? reject(err) : resolve(stats));
  });
}

function ensureKudosFolder(folder, filename) {
  if(!filename.startsWith('kudos-'))
    return Promise.resolve(null);

  return fileStats(`${folder}/${filename}`).then(stats => {
    if(stats.isDirectory())
      return filename;
  });
}

function getKudosFoldersIn(folder) {
  return readDir(path.resolve(folder))
  .then(files => Promise.all(files.map(f => ensureKudosFolder(folder, f))))
  .then(found => found.filter(f => !!f))
  .catch(() => []);
}

function getBuildPath(app) {
  switch(app) {
    case 'kudos-common':
      return '/dist';
    default:
      return '/exports/dist';
  }
}

function getKudosDependenciesIn(app) {
  return getKudosFoldersIn(`${app}/node_modules`);
}

function buildConfig() {
  return getKudosFoldersIn(CORE)
  .then(APPS => Promise.all(
    [CORE, ...APPS].map(target => {
      return getKudosDependenciesIn(target)
      .then(apps => apps.forEach((app) => {
        config[app] = config[app] || {path: getBuildPath(app), targets: []};
        config[app].targets.push(target);

        getKudosDependenciesIn(`${target}/node_modules/${app}`).then(secondLevel => {
          if(secondLevel && secondLevel.length) {
            console.error('\n!!! NESTED DEPENDENCY DETECTED !!!');
            console.error(`Please check "${target}/node_modules/${app}/node_modules" as it has shouldnt have: ${secondLevel}\n`);
            console.error('This is normally caused by different versions (commit hash) in package.lock');
            console.error('Easiest solution is to delete the package.lock and the node_modules and npm i \n');
          }
        });
      }));
    })
  ))
  .then(() => config);
}

module.exports = buildConfig;
