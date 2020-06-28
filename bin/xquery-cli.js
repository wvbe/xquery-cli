#!/usr/bin/env node

const ChildProcess = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const { Command, MultiOption, Option, Parameter } = require('ask-nicely');
const globby = require('globby');
const npmlog = require('npmlog');
const { getModules } = require('fontoxpath-module-loader');
const { report } = require('process');

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

// Serially send a bunch of file names off to a child process and call onResult every time there's a result
function gatherResultsFromChildProcesses({ files, modules, batch }, onResult) {
	return (function readNextBatch(fileList, accum = []) {
		const slice = fileList.length > batch ? fileList.slice(0, batch) : fileList;
		const nextSlice = fileList.length > batch ? fileList.slice(batch) : [];

		let i = 0;
		return new Promise((resolve) => {
			const child = ChildProcess.fork(path.resolve(__dirname, 'xquery-cli.child_process.js'));

			child.on('message', (message) => {
				if (message) {
					return onResult(message, i++);
				}

				// An empty message means end of transmission
				child.send({
					type: 'kill',
				});

				resolve();
			});

			child.send({
				type: 'run',
				fileList: slice,
				modules,
			});
		}).then((doms) => {
			// Recurse, or end
			return nextSlice.length
				? readNextBatch(nextSlice, accum.concat(doms))
				: accum.concat(doms);
		});
	})(files);
}

// Prepare an event listener and let all reporters add their listeners
const events = new EventEmitter();

new Command()
	.addParameter(
		new Parameter('glob')
			.setDescription('The files you want to validate, as a pattern (eg. "**/*.xml")')
			.setDefault('*.xml')
	)
	.addParameter(
		new Parameter('main').setResolver((input) => {
			if (!input) {
				return input;
			}
			const location = path.resolve(process.cwd(), input);
			if (!fs.existsSync(location)) {
				throw new Error(`Script "${input}" could not be found.`);
			}

			return location;
		})
	)
	.addOption(
		new Option('xpath')
			.setShort('x')
			.setDescription(
				'An XPath expression to run, as an alternative to piping it in here or using an XQuery module parameter'
			)
			.isRequired(false)
	)
	.addOption(
		'stdout',
		'o',
		'Log the outcomes of XQuery to STDOUT, log events and progress to STDERR'
	)
	.addOption(
		'stdout-only',
		'O',
		'Log the outcomes of XQuery to STDOUT, do not log events or progress to STDERR'
	)
	.addOption(
		new Option('batch')
			.setShort('b')
			.setDescription('The amount of documents per child process.')
			.isRequired(false)
			.setDefault(5000, true)
			.setResolver((value) => parseInt(value, 10))
	)
	.addOption(
		new Option('log-level')
			.setShort('l')
			.setDescription(
				'The minimum log level to log. One of "verbose" (everything) "info" (schematron reports and stats, default), or "error" (failing documents and errors)'
			)
			.isRequired(false)
			.setDefault('info', true)
	)
	.setController(async (req) => {
		const reporters = [];
		if (req.options.stdout || req.options['stdout-only']) {
			reporters.push(REPORTERS_BY_NAME.results);
		}
		if (!req.options['stdout-only']) {
			reporters.push(REPORTERS_BY_NAME.events);
		}

		reporters.forEach((reporter) => reporter(req, events, process.stdout));

		// Find the files to validate
		const globbedFiles = req.parameters.glob
			? await globby([req.parameters.glob], {
					cwd: process.cwd(),
					absolute: true,
			  })
			: [];
		events.emit('files', globbedFiles);

		if (!globbedFiles.length) {
			throw new Error('No use running an expression if you have no files.');
		}

		const modules = await getModulesFromInput(
			req.options.xpath || (await getStreamedInputData()),
			req.parameters.main
		);

		events.emit('modules', modules);
		events.emit('expression', modules.main.contents);
		if (!modules.main) {
			throw new Error('Your XPath expression should not be empty.');
		}

		// Send the schema and (parts of) the file list to child process(es)
		events.emit('start');

		await gatherResultsFromChildProcesses(
			{
				batch: req.options.batch,
				files: globbedFiles,
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
	})

	.execute(process.argv.slice(2))

	.catch((error) => {
		npmlog.disableProgress();
		npmlog.error('fatal', error.stack);

		process.exitCode = 1;
	})
	.then(() => {
		events.emit('end', process.exitCode);
	});
