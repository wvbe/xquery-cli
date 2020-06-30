#!/usr/bin/env node

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const globby = require('globby');
const npmlog = require('npmlog');
const { getModules } = require('fontoxpath-module-loader');

const evaluateForModules = require('../src/evaluateForModules');
const { evaluateInChildProcesses } = require('../src/childProcessCommunication');
const REPORTERS_BY_NAME = {
	events: require('../src/reporters/eventsToStdErr'),
	results: require('../src/reporters/resultsToStdOut'),
};

async function getModulesFromInput(expression, location) {
	return getModules(
		(referrer, target) => {
			const from = referrer ? path.dirname(referrer) : process.cwd();
			return path.resolve(from, target);
		},
		(target) => (target ? fs.readFileSync(target, 'utf8') : expression),
		location
	);
}

async function getStreamedInputData() {
	if (process.stdin.isTTY) {
		return;
	}
	let data = '';
	process.stdin.on('readable', () => {
		const chunk = process.stdin.read();
		if (chunk !== null) {
			data += chunk;
		}
	});

	return new Promise((resolve) => process.stdin.on('end', () => resolve(data)));
}

// Prepare an event listener and let all reporters add their listeners
const events = new EventEmitter();

async function run(input) {
	const files = [];
	let hasGlobbed = false;
	let hasLocations = false;
	const reporters = [REPORTERS_BY_NAME.events, REPORTERS_BY_NAME.results];
	const options = {};

	while (input.length) {
		const slice = input.shift();
		switch (slice) {
			case undefined:
			case '--':
				break;

			case '-m':
			case '--module':
			case '--main':
				options.main = input.shift();
				continue;

			case '-l':
			case '--log-level':
				npmlog.level = input.shift();
				continue;

			case '-x':
			case '--expression':
			case '--xpath':
			case '--xquery':
			case '--xquf':
				options.expression = input.shift();
				continue;

			case '-b':
			case '--batch':
			case '--batch-size':
				options.batch = parseInt(input.shift(), 10);
				continue;

			case '-g':
			case '--glob':
				hasGlobbed = true;
				files.splice(
					0,
					0,
					...(await globby([input.shift()], {
						cwd: process.cwd(),
						absolute: false,
					}))
				);
				continue;

			case '-O':
			case '--no-stderr':
				reporters.splice(reporters.indexOf(REPORTERS_BY_NAME.events), 1);
				continue;

			case '-o':
			case '--no-stdout':
				reporters.splice(reporters.indexOf(REPORTERS_BY_NAME.results), 1);
				continue;

			default:
				hasLocations = true;
				files.push(slice);
		}
	}

	reporters.forEach((reporter) => reporter(events, process.stdout));

	events.emit('files', files);

	const modules = await getModulesFromInput(
		options.expression || (await getStreamedInputData()),
		options.main
	);
	events.emit('modules', modules);

	if (!modules.main || !modules.main.contents) {
		throw new Error('Your XPath expression should not be empty.');
	}

	// Send the schema and (parts of) the file list to child process(es)
	events.emit('start');
	if (!hasGlobbed && !hasLocations) {
		try {
			events.emit('result', {
				$value: await evaluateForModules(
					modules,
					null,
					{ cwd: process.cwd() },
					{ debug: true }
				),
			});
		} catch (e) {
			events.emit('result', { $error: e });
		}
		return;
	}

	await evaluateInChildProcesses(
		path.resolve(__dirname, 'child_process.js'),
		files,
		options.batch,
		{
			modules,
		},
		(result, i) => {
			if (result.$error) {
				process.exitCode = 1;
			}

			result.$fileNameBase = path
				.relative(process.cwd(), result.$fileName)
				.replace(/\\/g, '/');

			events.emit('file', result, i);
		}
	);
}

(async (input) => {
	try {
		await run(input);
	} catch (error) {
		npmlog.disableProgress();
		process.exitCode = 1;
		events.emit('error', error);
		return;
	}

	events.emit('end', process.exitCode);
})(process.argv.slice(2));
