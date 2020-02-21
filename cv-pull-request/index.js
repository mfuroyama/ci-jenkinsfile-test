'use strict';

const { Octokit } = require("@octokit/rest");
const meow = require('meow');

const FLAGS = {
    env: { type: 'string', alias: 'e', required: true, values: ['test', 'prod', 'release'] },
    project: { type: 'string', alias: 'p', required: true, values: ['ccp', 'vas'] },
    version: { type: 'string', alias: 'v', required: true },
    org: { type: 'string', alias: 'o', default: 'mfuroyama', required: false },
    repo: { type: 'string', alias: 'r', default: 'project-flow-test', required: false },
    token: { type: 'string', alias: 't', required: false },
    reviewers: { type: 'string', alias: 'x', required: true },
    debug: { type: 'boolean', alias: 'd' },
};

const cli = meow(`
    Usage
        cv-pull-request [options]

    Options
        --env, -e       [REQUIRED] CV deploy environment ('test', 'prod' or 'release')
        --project, -p   [REQUIRED] CV project name ('ccp' or 'vas')
        --version, -v   [REQUIRED] CV release version (used as applicable)
        --org, -o       GitHub organization (defaults to 'mfuroyama')
        --repo, -r      [REQUIRED] GitHub repository for this CV layer
        --token, -t     [REQUIRED] GitHub API token
        --reviewers, -x [REQUIRED] Comma-delimited list of pull request reviewers
        --debug, -d     Run in debug mode if present (defaults to false)
        --help, -h      Show this message
`, { flags: FLAGS });

const onError = (msg) => {
    console.log(`ERROR: ${msg}`);
    process.exit(1);
};

const validateOptions = (options) => {
    const validate = (key, acceptableValues) => {
        const value = options[key];
        if (options[key] === undefined || options[key] === null) {
            onError(`Required option "${key}" is missing`);
        }
        if (Array.isArray(acceptableValues) && !acceptableValues.includes(value)) {
            onError(`Required option "${key}" must be one of the following values: ${acceptableValues.join(', ')}`);
        }
    }

    Object.keys(FLAGS).forEach((key) => {
        if (FLAGS[key].required) {
            validate(key, FLAGS[key].values);
        }
    });
}

const formatReviewers = (options) => options.reviewers.split(',').map(val => val.trim());
const unversionedBranch = (env, flags) => `cv/${flags.project}/${env}`;
const versionedBranch = (env, flags) => `${unversionedBranch(env, flags)}/${flags.version}`;

const BRANCH_FORMATTERS = {
    dev: unversionedBranch.bind(null, 'dev'),
    test: versionedBranch.bind(null, 'test'),
    prod: versionedBranch.bind(null, 'prod'),
    release: unversionedBranch.bind(null, 'release'),
};

const PULL_REQUEST_SOURCE_MAP = {
    test: 'dev',
    prod: 'test',
    release: 'prod',
};

const formatBranch = (env, flags) => {
    const sourceEnv = PULL_REQUEST_SOURCE_MAP[env];
    return [BRANCH_FORMATTERS[env](flags), BRANCH_FORMATTERS[sourceEnv](flags)];
};

const createPullRequest = async (options) => {
    const {
        env,
        org,
        repo,
        token,
        reviewers,
        debug,
    } = options;

    const octokit = Octokit({
        userAgent: 'HRG GitHub Utilities',
        timezone: 'Pacific/Honolulu',
        ...(debug && { log: console }),
        ...(token && { auth: token }),
    });

    const target = env;
    const source = PULL_REQUEST_SOURCE_MAP[env];
    const title = `Deployment merge from ${source.toUpperCase()} to ${target.toUpperCase()}`;
    const [base, head] = formatBranch(env, options);
    const body = [
        '## Merge Checklist',
        '* [ ] Verify correct merge branches',
        '* [ ] Very help documentation has been cleansed, generated and deployed',
        '* [ ] Resolve any and all branch merge conflicts, if they exist',
        '* [ ] Notify test group of the impending deployment',
        '',
        '**Important Note!** Do **NOT** delete the head branch after completing the pull request merge!',
    ].join('\n');

    const params = {
        owner: org,
        repo,
        title,
        head,
        base,
        body,
    };

    if (debug) {
        console.log(params);
    }

    try {
        const results = await octokit.pulls.create(params);
        console.dir(results, { depth: null, colors: true });

        const { data: { number } } = results;

        const reviewParams = {
            owner: org,
            repo,
            pull_number: number,
            reviewers,
        };

        const reviewResults = await octokit.pulls.createReviewRequest(reviewParams);
        console.dir(reviewResults, { depth: null, colors: true });
    } catch (err) {
        console.log(err.toString());
        if (debug) {
            console.log(err.stack);
        }
    }
};

const { flags } = cli;
validateOptions(flags);
flags.reviewers = formatReviewers(flags);

(async () => {
    await createPullRequest(flags);
    process.exit(0);
})();