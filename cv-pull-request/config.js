'use strict';

const prompts = require('prompts');
const fs = require('fs-extra');
const chalk = require('chalk');
const meow = require('meow');
const yaml = require('js-yaml');
const { format } = require('date-fns');

const FLAGS = {
    configFile: { type: 'string', alias: 'c', default: './cv-pull-request.yaml' },
    debug: { type: 'boolean', alias: 'd', default: false },
};

const cli = meow(`
    Usage
        cv-pull-request [options]

    Options
        --configFile, -c   [OPTIONAL] YAML configuration file (default: './cv-pull-request.yaml')
        --debug, -d        [OPTIONAL] Run in debug mode if present (default: false)
        --help, -h         Show this message
`, { flags: FLAGS });

const { flags } = cli;

const DEFAULT_PROJECT_CONFIG = [{
    name: 'JLV - CCP',
    repo: 'JLV',
    head: 'cvccp_dev_{version}',
    base: 'cvccp_test_{version}',
}, {
    name: 'JLV - VAS',
    repo: 'JLV',
    head: 'cvvas_dev_{version}',
    base: 'cvvas_test_{version}',
}, {
    name: 'JMeadows - CCP',
    repo: 'jMeadows',
    head: 'cvccp_dev_{version}',
    base: 'cvccp_test_{version}',
}, {
    name: 'JMeadows - VAS',
    repo: 'jMeadows',
    head: 'cvvas_dev_{version}',
    base: 'cvvas_test_{version}',
}, {
    name: 'HuiCore',
    repo: 'HuiCore',
    head: 'cv_dev_{version}',
    base: 'cv_test_{version}',
}, {
    name: 'VistA Data Service',
    repo: 'VistaDataService',
    head: 'cv_dev_{version}',
    base: 'cv_test_{version}',
}, {
    name: 'JLV QoS',
    repo: 'jlvqos',
    head: 'cv_dev_{version}',
    base: 'cv_test_{version}',
}, {
    name: 'Report Builder',
    repo: 'ReportBuilder',
    head: 'cv_dev_{version}',
    base: 'cv_test_{version}',
}];

const DEFAULT_CONFIG = {
    version: '',
    owner: 'HRG-Technologies-LLC',
    userAgent: 'HRG GitHub Utilities',
    timezone: 'Pacific/Honolulu',
    token: '',
    projects: DEFAULT_PROJECT_CONFIG,
}

const readOptionFile = () => {
    const fileString = chalk.white.bold(flags.configFile);
    console.log(`Reading config file ${fileString}...`);
    try {
        const options = yaml.safeLoad(fs.readFileSync(flags.configFile));
        return options;
    } catch (err) {
        console.log(chalk.yellow(`Couldn't load file ${fileString}, using default values...`));
        return {};
    }
}

const writeOptionFile = (options = {}) => {
    const fileString = chalk.white.bold(flags.configFile);
    const { date, debug, ...targetOptions } = options;
    console.log(`Writing config file ${fileString}...`);
    try {
        fs.writeFileSync(flags.configFile, yaml.safeDump(targetOptions));
    } catch (err) {
        const errorString = chalk.red(err.toString());
        console.log(chalk.yellow(`Couldn't save file ${fileString}, using default values...`));
        console.log(`Couldn't save file ${chalk.yellow(flags.configFile)} ${errorString}`);
    }
};

const getOptions = () => Object.assign({
    debug: flags.debug,
    date: format(new Date(), 'MM-dd-yyyy'),
}, DEFAULT_CONFIG, readOptionFile());

const onCancel = () => {
    process.exit(0);
}

// ======================================================== API ========================================================
const getConfig = async () => {
    const options = getOptions();

    const questions = [{
        type: 'text',
        name: 'version',
        initial: options.version || '',
        message: 'What CV version are you building?',
        validate: value => value ? true : 'Please enter a version',
    }, {
        type: 'list',
        name: 'assignees',
        initial: Array.isArray(options.assignees) ? options.assignees.join(',') : '',
        message: 'Who are the issue assignees? (separate multiple assignees with a comma)',
        validate: value => value.length > 0 ? true : 'Please enter at least one assignee',
    }, {
        type: 'text',
        name: 'token',
        initial: options.token || '',
        message: 'What GitHub API token should we use?',
        validate: value => value ? true : 'Please enter a GitHub API token',
    }];

    const config = await prompts(questions, { onCancel });
    return Object.assign(options, config);
}

const saveConfig = (config) => {
    writeOptionFile(config);
}

module.exports = {
    getConfig,
    saveConfig,
    version: cli.pkg.version,
};