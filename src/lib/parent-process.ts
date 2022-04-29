import { EventEmitter } from 'events';
import { getModules } from 'fontoxpath-module-loader';
import fs from 'fs/promises';
import glob from 'glob';
import npmlog from 'npmlog';
import path from 'path';
import { promisify } from 'util';

import { ContextlessResultEvent, Options, XqueryModules } from '../types';
import { evaluateUpdatingExpressionOnNode } from './child-process';
import { evaluateInChildProcesses } from './communication';
import { bindEventLoggers, bindResultLoggers } from './logging';

const promisedGlob = promisify(glob);

const SHORT_OPTION_MAPPING: { [short: string]: string } = {
	m: 'module',
	d: 'dry',
	x: 'expression',
	l: 'log-level',
	p: 'positions',
	b: 'batch-size',
	g: 'glob',
	O: 'no-stderr',
	o: 'no-stdout',
};

async function parseArgv(input: string[]): Promise<Options> {
	const options: Omit<Options, 'modules'> & { modules?: Options['modules'] } = {
		files: [],
		hasGlobbed: false,
		hasLocations: false,
		hasEventLogging: true,
		hasResultLogging: true,
		isDryRun: false,
		usePositionTracking: false,
		batchSize: 25,
	};

	let mainModuleName, cliExpression;
	while (input.length) {
		const slice = input.shift();
		if (slice && slice.match(/^-[a-z]+$/)) {
			input.unshift(
				...slice
					.substr(1)
					.split('')
					.map((short) => (SHORT_OPTION_MAPPING[short] ? `--${SHORT_OPTION_MAPPING[short]}` : null))
					.filter((long): long is string => Boolean(long)),
			);
			continue;
		}
		switch (slice) {
			case null:
				continue;

			case undefined:
			case '--':
				break;

			case '--module':
			case '--main':
				mainModuleName = input.shift();
				continue;

			case '--dry':
				options.isDryRun = true;
				continue;

			case '--log-level':
				npmlog.level = input.shift();
				continue;

			case '--position':
			case '--positions':
				options.usePositionTracking = true;
				continue;

			case '--expression':
			case '--xpath':
			case '--xquery':
			case '--xquf':
				cliExpression = input.shift();
				continue;

			case '--batch':
			case '--batch-size':
				options.batchSize = parseInt(input.shift() || String(options.batchSize), 10);
				continue;

			case '--glob':
				const glob = input.shift();
				if (!glob) {
					throw new Error(`Invalid globbing pattern "${glob}"`);
				}
				options.hasGlobbed = true;
				options.files.splice(
					0,
					0,
					...(await promisedGlob(glob, {
						cwd: process.cwd(),
						absolute: false,
					})),
				);
				continue;

			case '--no-stderr':
				options.hasEventLogging = false;
				continue;

			case '--no-stdout':
				options.hasResultLogging = false;
				continue;

			default:
				options.hasLocations = true;
				options.files.push(slice);
		}
	}

	options.modules = await getModulesFromInput(
		cliExpression || (await getStreamedInputData()),
		mainModuleName,
	);

	if (!options.modules.main || !options.modules.main.contents) {
		throw new Error('Your XPath expression should not be empty.');
	}

	return options as Options;
}

async function getModulesFromInput(expression?: string, location?: string): Promise<XqueryModules> {
	return getModules(
		(referrer: string, target: string) => {
			const from = referrer ? path.dirname(referrer) : process.cwd();
			return path.resolve(from, target);
		},
		(target: string) => (target ? fs.readFile(target, 'utf8') : expression),
		location,
	);
}

async function getStreamedInputData(): Promise<string | undefined> {
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

async function evaluateAll(events: EventEmitter, input: string[], childProcessLocation: string) {
	const options = await parseArgv(input);

	bindResultLoggers(options, events, process.stdout);

	if (options.hasEventLogging) {
		bindEventLoggers(options, events, process.stderr);
	}

	events.emit('files', options.files);

	events.emit('modules', options.modules);

	// Send the schema and (parts of) the file list to child process(es)
	events.emit('start');
	if (!options.hasGlobbed && !options.hasLocations) {
		events.emit('expression', options.modules.main.contents);
		try {
			events.emit('result', {
				$value: (
					await evaluateUpdatingExpressionOnNode(
						options.modules,
						null,
						{ cwd: process.cwd() },
						{ debug: true },
					)
				).returnValue,
			} as ContextlessResultEvent);
		} catch (e) {
			events.emit('result', { $error: e } as ContextlessResultEvent);
		}
		return;
	}

	await evaluateInChildProcesses(childProcessLocation, options, (result, i) => {
		if (result.$error) {
			process.exitCode = 1;
		}

		result.$fileNameBase = path.relative(process.cwd(), result.$fileName).replace(/\\/g, '/');

		events.emit('file', result, i);
	});
}

export async function startParentProcess(input: string[], childProcessLocation: string) {
	// Prepare an event listener and let all reporters add their listeners
	const events = new EventEmitter();
	try {
		await evaluateAll(events, input, childProcessLocation);
	} catch (error) {
		npmlog.disableProgress();
		process.exitCode = 1;
		events.emit('error', error);
		return;
	}

	events.emit('end', process.exitCode);
}
