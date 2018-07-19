#!/usr/bin/env node

const {mapGitDeps, npmInstallCmd, executeInSeries, getCommitUpdate} = require('./git-deps.utils');
const path = require('path');
const pckg = require(path.resolve('package.json'));

migrateGitDeps(pckg.dependencies);

function migrateGitDeps(deps) {
  return Promise.all(mapGitDeps(deps, (name, url, commit) => {
    if(name.split('-').pop()!=='service') return Promise.resolve();
    const uninstall = `npm uninstall -s ${name}`;
    return getCommitUpdate(url).then(newCommit => {
      const newName = name+'-exports';
      const install = npmInstallCmd(url.replace(name, newName), newCommit, name);
      console.log(`Going to migrate ${name}...`);
      return [uninstall, install];
    });
  }))
  .then(cmds => {
    cmds = cmds.filter(c => !!c);
    cmds = cmds.reduce((acc, val) => acc.concat(val), []); //flatten
    return executeInSeries(cmds, true);
  });
}
