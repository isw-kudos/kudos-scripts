/* eslint import/no-commonjs: 0, no-console: 0 */
const {exec} = require('child_process');
const path = require('path');


const pckg = require(path.resolve('package.json'));

return checkForUpdates(pckg.dependencies, pckg.name).then(processUpdates).then(logResults);


/**
 * Checks deps for git based repos without the latest commit hashes or no commit hashes
 * @param deps - object with npm dependencies
 * @return - Promise that resolves to an array of deps that need to be updated and latest commit hash - [{name, url, commit}]
 */
function checkForUpdates(deps, name = '') {
  console.log(`Checking for git dependency updates in '${name}'...`);
  return Promise.all(Object.keys(deps).map(name => {
    const version = deps[name];
    const [url, oldCommit] = parseVersion(version);
    if(!url) return Promise.resolve();
    return getCommitUpdate(url, oldCommit)
    .then(commit => commit ? {name, url, commit} : null)
    .catch(err => console.error(`Error getting latest commitId for ${name}`, err));
  }))
  .then(updates => {
    updates = updates.filter(u => !!u);
    console.log(`Found ${updates.length} update(s)`);
    return updates;
  });
}


/**
 * Runs npm i in series as per updates
 * @param updates - array of deps that need to be updated and latest commit hash
 * @return Promise that resolves to results array with [success, total]
 */
function processUpdates(updates) {
  //execute commands in series
  return updates.reduce((prev, update) => {
    const {name, url, commit} = update;
    return prev.then(results => {
      console.log(`Updating '${name}' to commit ${commit}`);
      return execute(npmStr(name, url, commit))
      .then(() => !!(results[0] += 1) && results) //update success number
      .catch(() => results);
    });
  }, Promise.resolve([0, updates.length]));
}


function logResults([success, total]) {
  if(total) {
    const fail = total - success;
    if(fail) console.log(`Failed to update ${fail} pckg(s)`);
    if(success) console.log(`Updated ${success} pckg(s)\nPlease commit package.json`);
  } else console.log('All git deps up to date');
  console.log('\n');
}


/**
 * Checks if str is a hosted git repo and ensures url is separated from commit hash
 * @param version string of a github repo in package.json
 * @return [url, commit] or [] if not valid version
 */
function parseVersion(version) {
  if (version.startsWith('git+https')) {
    const url = version.substring(4);
    const parts = url.split('#');
    if(0 < parts.length <= 2) return parts;
  }
  return [];
}


/**
 * Check if git repo at url has a newer commit than the one passed in
 * @param url
 * @param commit
 * @return Promise that resolves to commitId if there is a newer one or null
 */
function getCommitUpdate(url, commit) {
  return execute(`git ls-remote ${url} HEAD`)
  .then(output => {
    const words = output.split(/\s/);
    if(!words.length)
      return Promise.reject(`git ls-remote output: ${output}`);
    
    const latestCommit = words[0];
    if(latestCommit!==commit)
      return latestCommit;
  });
}

function npmStr(name, url, commitId) {
  return `npm i -s git+${url}#${commitId}`;
}

function execute(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout) => error ? reject(error) : resolve(stdout));
  });
}
