'use strict';

const prompts = require('prompts');
const fs = require('fs-extra');
const chalk = require('chalk');
const meow = require('meow');
const yaml = require('js-yaml');
const { format } = require('date-fns');

const FLAGS = {
    version: { type: 'string', alias: 'v', required: true },
    assignees: { type: 'string', alias: 'a', required: true },
    token: { type: 'string', alias: 't', required: true },
    automatic: { type: 'boolean', alias: 'y', default: false },
    configFile: { type: 'string', alias: 'c', default: './cv-pull-request.yaml' },
    saveConfig: { type: 'boolean', alias: 's', default: false },
    debug: { type: 'boolean', alias: 'd', default: false },
    help: { type: 'boolean', alias: 'h', default: false },
};

const REQUIRED_FIELDS = Object.keys(FLAGS).filter(key => FLAGS[key].required);

const cli = meow(`
    Usage
        cv-pull-request [options]

    Options
        --version, -v      [REQUIRED] CV release version
        --assignees, -a    [REQUIRED] Assignees (comma-separated list)
        --token, -t        [REQUIRED] GitHub API token
        --automatic, -y    [OPTIONAL] Automatic mode; disable interactive prompts. This mode will raise errors if all
                                      required fields are not present
        --configFile, -c   [OPTIONAL] YAML configuration file (default: './cv-pull-request.yaml')
        --saveConfig, -s   [OPTIONAL] Save the configuration values to the specified config file (default: false)
        --debug, -d        [OPTIONAL] Run in debug mode if present (default: false)
        --help, -h         Show this message
`, { flags: FLAGS });

const { flags } = cli;
const { assignees } = flags;
flags.assignees = (typeof assignees === 'string') ? assignees.split(',') : assignees;

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
};

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
};

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
    date: format(new Date(), 'MM-dd-yyyy'),
}, DEFAULT_CONFIG, readOptionFile());

const onCancel = () => {
    process.exit(0);
};

// ======================================================== API ========================================================
const getConfig = async () => {
    const options = getOptions();
    Object.assign(options, { automatic: flags.automatic });

    if (flags.automatic) {
        Object.assign(options, flags);
        const missingFields = REQUIRED_FIELDS.filter(fieldName => !options[fieldName]);
        if (missingFields.length > 0) {
            const missingFieldsStr = chalk.red(missingFields.join(', '));
            console.log(chalk.red.bold(`Missing required fields: ${missingFieldsStr}`));
            console.log(cli.help);
            process.exit(1);
        }
        return options;
    }

    const questions = [{
        type: 'text',
        name: 'version',
        initial: options.version || '',
        message: 'What CV version are you building?',
        validate: value => (value ? true : 'Please enter a version'),
    }, {
        type: 'list',
        name: 'assignees',
        initial: Array.isArray(options.assignees) ? options.assignees.join(',') : '',
        message: 'Who are the issue assignees? (separate multiple assignees with a comma)',
        validate: value => (value.length > 0 ? true : 'Please enter at least one assignee'),
    }, {
        type: 'text',
        name: 'token',
        initial: options.token || '',
        message: 'What GitHub API token should we use?',
        validate: value => (value ? true : 'Please enter a GitHub API token'),
    }];

    prompts.override(flags);
    const config = await prompts(questions, { onCancel });
    return Object.assign(options, config);
};

const saveConfig = (config) => {
    if (flags.saveConfig) {
        writeOptionFile(config);
    }
};

module.exports = {
    getConfig,
    saveConfig,
    version: cli.pkg.version,
};
