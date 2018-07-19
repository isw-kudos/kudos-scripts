const {exec} = require('child_process');

module.exports = {
  mapGitDeps,
  npmInstallCmd,
  executeInSeries,
  getCommitUpdate,
  execute
};

function mapGitDeps(deps, fn) {
  return Object.keys(deps || {}).map(name => {
    const version = deps[name];
    const [url, commit] = parseVersion(version);
    return url ? fn(name, url, commit) : null
  }).filter(d => !!d);
}

function npmInstallCmd(url, commit) {
  commit = commit ? '#'+commit : '';
  return `npm install -s git+${url}${commit}`;
}


function execute(cmd) {
  const verbose = process.env.VERBOSE
  return new Promise((resolve, reject) =>
    exec(cmd, (error, stdout, stderr) => {
      if(error) return console.log(error, stderr) || reject(error);
      if(verbose) console.log(cmd) || console.log(stdout);
      return resolve(stdout);
    })
  );
}

//execute commands in series
function executeInSeries(cmds, failOnErr) {
  return cmds.reduce(
    (prev, cmd) => prev.then(results => execute(cmd)
      .catch((err) => failOnErr ? Promise.reject(err) : results[0]-=1) //subtract success number
      .then(() => results)
    ),
    Promise.resolve([cmds.length, cmds.length])
  );
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
