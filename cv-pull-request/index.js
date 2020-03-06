'use strict';

const { Octokit } = require('@octokit/rest');
const Listr = require('listr');
const chalk = require('chalk');
const prompts = require('prompts');
const figures = require('figures');
const terminalLink = require('terminal-link');
const { getConfig, saveConfig, version: appVersion } = require('./config');

const getRequests = async (config) => {
    const { projects, ...rest } = config;
    const requests = projects
        .map(project => ({ ...project, ...rest }))
        .map((project) => {
            const { version, head, base } = project;
            return Object.assign(project, {
                head: head.replace(/{version}/g, version),
                base: base.replace(/{version}/g, version),
            });
        });

    console.log('The generator will create pull requests in the following GitHub repositories:\n');
    requests.forEach((request) => {
        const {
            name, owner, repo, head, base,
        } = request;
        const urlString = chalk.cyan(`https://github.com/${owner}/${repo}`);
        console.log(`${chalk.bold(name)} [in ${urlString}]`);
        console.log(chalk.italic(`   ${base} <-- ${head}\n`));
    });

    if (!config.automatic) {
        const { isOk } = await prompts({
            type: 'confirm',
            name: 'isOk',
            message: 'Is this okay?',
            initial: true,
        });

        if (!isOk) {
            process.exit(0);
        }
    }

    return requests;
};

const createPullRequest = async (request) => {
    const {
        userAgent, timezone, debug, token,
    } = request;

    const octokit = Octokit({
        userAgent,
        timezone,
        auth: token,
        ...(debug && { log: console }),
    });

    const {
        name, version, date, owner, head, base, repo, assignees,
    } = request;
    const title = `${name} ${version} ${date} Merge Dev Branch into Test Branch`;
    const body = [
        'Weekly build trigger for DTE Gold Test',
        '',
        '## Merge Checklist',
        '* [ ] Verify correct merge branches',
        '* [ ] Resolve any and all branch merge conflicts, if they exist',
        '* [ ] Tag merge commit after merging',
        '',
        '**Important Note!** Do **NOT** delete the head branch after completing the pull request merge!',
    ].join('\n');

    const result = {
        state: 'OK',
        value: '',
    };

    try {
        // Create the base pull request
        const params = {
            owner,
            repo,
            title,
            head,
            base,
            body,
        };
        const results = await octokit.pulls.create(params);
        const { data: { html_url: htmlURL, number } } = results;
        result.value = htmlURL;

        const assigneeParams = {
            owner,
            repo,
            issue_number: number,
            assignees,
        };
        await octokit.issues.addAssignees(assigneeParams);
    } catch (err) {
        const getErrorMessage = () => {
            const { errors } = err;
            if (!Array.isArray(errors) || errors.length === 0) {
                return err.toString();
            }
            const [error] = errors;
            return (error.message || err.toString());
        };
        Object.assign(result, { state: 'ERROR', value: getErrorMessage() });
    }

    return result;
};

const createPullRequests = async (requests) => {
    const tasks = requests.map((request) => {
        const { name } = request;
        return {
            title: name,
            task: async (ctx) => {
                ctx[name] = await createPullRequest(request);
            },
        };
    });

    const taskRunner = new Listr(tasks, { concurrent: true });
    const results = await taskRunner.run({});

    return results;
};

const SYMBOL_MAP = {
    OK: chalk.green(figures.tick),
    ERROR: chalk.red(figures.cross),
};

const reportResults = async (results) => {
    console.log(chalk.green('\n==== CV PULL REQUEST RESULTS ===='));
    console.log(chalk.yellow.italic(chalk`(Hold the {bold Command} key to follow the hyperlinks)\n`));
    Object.keys(results).forEach((project) => {
        const { state, value } = results[project];
        const message = state === 'OK' ? chalk.cyan(terminalLink(value, value)) : chalk.red(value);
        console.log(` ${SYMBOL_MAP[state]} ${chalk.bold(project)}: ${message}`);
    });
    console.log();
};

(async () => {
    const versionString = chalk.green.bold(`v${appVersion}`);
    console.log(chalk.green(`==== CV PULL REQUEST GENERATOR, ${versionString} ====\n`));

    const config = await getConfig();
    const requests = await getRequests(config);
    const results = await createPullRequests(requests);

    reportResults(results);
    saveConfig(config);
})();
