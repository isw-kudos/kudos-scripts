import {mapGitDeps, npmInstallCmd, executeInSeries, getCommitUpdate} from './git-deps.update';
const path = require('path');

const pckg = require(path.resolve('package.json'));

migrateGitDeps(pckg.dependencies).then()

function migrateGitDeps(deps) {
  return Promise.all(mapGitDeps(deps, (name, url, commit) => {
    if(name.split('-').pop()!=='service') return Promise.resolve();
    const uninstall = npmInstallCmd(name, url, null, true);
    return getCommitUpdate(url).then(newCommit => {
      const install = npmInstallCmd(name+'-exports', url+'-exports', newCommit);
      return [`echo "Migrating ${name}..."`, uninstall, install];
    });
  }))
  .then(cmds => {
    cmds = cmds.filter(c => !!c);
    cmds = cmds.flat();
    return executeInSeries(cmds);
  });
}
