#!/usr/bin/env node

const ChildProcess = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const { Command, MultiOption, Option, Parameter } = require('ask-nicely');
const globby = require('globby');
const npmlog = require('npmlog');

const { getXQueryModulesInDependencyOrder } = require('../src/fontoxpathModuleContext');
const REPORTERS_BY_NAME = {
	events: require('./reporters/events'),
	results: require('./reporters/results')
};

async function getCliInputData(xpath, xqueryModuleLocation) {
	const modules = xqueryModuleLocation
		? getXQueryModulesInDependencyOrder(xqueryModuleLocation)
		: null;

	if (modules && xpath) {
		throw new Error('You cannot use both an XQuery (main) module and an XPath expression');
	}

	if (modules) {
		const mainModule = modules.find(mod => mod.main);
		return {
			expression: mainModule.contents,
			modules: modules.filter(mod => mod !== mainModule)
		};
	}
	return {
		expression: xpath,
		modules: []
	};
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

	return new Promise(resolve =>
		process.stdin.on('end', () => resolve({ expression: data, modules: [] }))
	);
}

// Serially send a bunch of file names off to a child process and call onResult every time there's a result
function gatherResultsFromChildProcesses({ files, modules, expression, batch }, onResult) {
	return (function readNextBatch(fileList, accum = []) {
		const slice = fileList.length > batch ? fileList.slice(0, batch) : fileList;
		const nextSlice = fileList.length > batch ? fileList.slice(batch) : [];

		let i = 0;
		return new Promise(resolve => {
			const child = ChildProcess.fork(path.resolve(__dirname, 'xquery-cli.child_process.js'));

			child.on('message', message => {
				if (message) {
					return onResult(message, i++);
				}

				// An empty message means end of transmission
				child.send({
					type: 'kill'
				});

				resolve();
			});

			child.send({
				type: 'run',
				fileList: slice,
				expression,
				modules
			});
		}).then(doms => {
			// Recurse, or end
			return nextSlice.length
				? readNextBatch(nextSlice, accum.concat(doms))
				: accum.concat(doms);
		});
	})(files);
}

new Command()
	.addParameter(
		new Parameter('glob')
			.setDescription('The files you want to validate, as a pattern (eg. "**/*.xml")')
			.setDefault('*.xml')
	)
	.addParameter(
		new Parameter('main').setResolver(input => {
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
		new MultiOption('files')
			.setShort('f')
			.setDescription('A list of source files. ')
			.isRequired(false)
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
		new MultiOption('reporters')
			.setShort('r')
			.setDescription('Any number of reporters, space separated: events results')
			.setDefault([null])
			.setResolver(value =>
				!value.length
					? [REPORTERS_BY_NAME.events, REPORTERS_BY_NAME.results]
					: value
							.filter(name => !!name)
							.map(reporterName => {
								if (!REPORTERS_BY_NAME[reporterName]) {
									`Reporter "${reporterName}" does not exist, use any of: ${Object.keys(
										REPORTERS_BY_NAME
									).join(' ')}`;
								}
								return REPORTERS_BY_NAME[reporterName];
							})
			)
	)
	.addOption(
		new Option('batch')
			.setShort('b')
			.setDescription('The amount of documents per child process.')
			.isRequired(false)
			.setDefault(5000, true)
			.setResolver(value => parseInt(value, 10))
	)
	.addOption(
		new Option('log-level')
			.setShort('l')
			.setDescription(
				'The minimum log level to log. One of "verbose" (everything) "info" (schematron reports and stats, default), "warn" (failing asserts), "error" (failing documents and errors) or "silent".'
			)
			.isRequired(false)
			.setDefault('info', true)
	)
	.setController(async req => {
		// Prepare an event listener and let all reporters add their listeners
		const events = new EventEmitter();
		req.options.reporters.forEach(reporter => reporter(req, events, process.stdout));

		// Find the files to validate
		const globbedFiles = req.parameters.glob
			? await globby([req.parameters.glob], {
					cwd: process.cwd(),
					absolute: true
			  })
			: [];
		events.emit('files', globbedFiles);
		if (!globbedFiles.length) {
			throw new Error('No use running an expression if you have no files.');
		}

		const { expression, modules } =
			req.options.xpath || req.parameters.main
				? await getCliInputData(req.options.xpath, req.parameters.main)
				: (await getStreamedInputData()) || {};
		events.emit('modules', modules);
		events.emit('expression', expression);
		if (!expression) {
			throw new Error('Your XPath expression should not be empty.');
		}

		// Send the schema and (parts of) the file list to child process(es)
		events.emit('start');
		await gatherResultsFromChildProcesses(
			{
				batch: req.options.batch,
				files: globbedFiles,
				modules,
				expression
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

		events.emit('end', process.exitCode);
	})

	.execute(process.argv.slice(2))

	.catch(error => {
		npmlog.disableProgress();
		npmlog.error('fatal', error.stack);

		process.exitCode = 1;
	});
