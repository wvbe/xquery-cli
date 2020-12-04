import { EventEmitter } from 'events';
import { getModules } from 'fontoxpath-module-loader';
import fs from 'fs/promises';
import globby from 'globby';
import npmlog from 'npmlog';
import path from 'path';
import { evaluateUpdatingExpressionOnNode } from './child-process';
import { evaluateInChildProcesses } from './communication';
import { bindEventLoggers, bindResultLoggers } from './logging';
import { ContextlessResultEvent, XqueryModules } from '../types';

type RunOptions = {
	files: string[];
	hasGlobbed: boolean;
	hasLocations: boolean;
	hasEventLogging: boolean;
	hasResultLogging: boolean;
	options: {
		main?: string;
		level?: string;
		expression?: string;
		batch?: number;
	};
};
async function parseArgv(input: string[]): Promise<RunOptions> {
	const runOptions: RunOptions = {
		files: [],
		hasGlobbed: false,
		hasLocations: false,
		hasEventLogging: true,
		hasResultLogging: true,
		options: {}
	};

	while (input.length) {
		const slice = input.shift();
		switch (slice) {
			case undefined:
			case '--':
				break;

			case '-m':
			case '--module':
			case '--main':
				runOptions.options.main = input.shift();
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
				const expression = input.shift();
				if (!expression) {
					throw new Error(`Invalid expression "${expression}"`);
				}
				runOptions.options.expression = expression;
				continue;

			case '-b':
			case '--batch':
			case '--batch-size':
				const size = input.shift();
				if (!size) {
					throw new Error(`Invalid batch size "${size}"`);
				}
				runOptions.options.batch = parseInt(size, 10);
				continue;

			case '-g':
			case '--glob':
				const glob = input.shift();
				if (!glob) {
					throw new Error(`Invalid globbing pattern "${glob}"`);
				}
				runOptions.hasGlobbed = true;
				runOptions.files.splice(
					0,
					0,
					...(await globby([glob], {
						cwd: process.cwd(),
						absolute: false
					}))
				);
				continue;

			case '-O':
			case '--no-stderr':
				runOptions.hasEventLogging = false;
				continue;

			case '-o':
			case '--no-stdout':
				runOptions.hasResultLogging = false;
				continue;

			default:
				runOptions.hasLocations = true;
				runOptions.files.push(slice);
		}
	}

	return runOptions;
}

async function getModulesFromInput(expression?: string, location?: string): Promise<XqueryModules> {
	return getModules(
		(referrer: string, target: string) => {
			const from = referrer ? path.dirname(referrer) : process.cwd();
			return path.resolve(from, target);
		},
		(target: string) => (target ? fs.readFile(target, 'utf8') : expression),
		location
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

	return new Promise(resolve => process.stdin.on('end', () => resolve(data)));
}

async function evaluateAll(events: EventEmitter, input: string[], childProcessLocation: string) {
	const {
		files,
		hasGlobbed,
		hasLocations,
		hasEventLogging,
		hasResultLogging,
		options
	} = await parseArgv(input);

	if (hasResultLogging) {
		bindResultLoggers(events, process.stdout);
	}
	if (hasEventLogging) {
		bindEventLoggers(events, process.stderr);
	}

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
				$value: (
					await evaluateUpdatingExpressionOnNode(
						modules,
						null,
						{ cwd: process.cwd() },
						{ debug: true }
					)
				).returnValue
			} as ContextlessResultEvent);
		} catch (e) {
			events.emit('result', { $error: e } as ContextlessResultEvent);
		}
		return;
	}

	await evaluateInChildProcesses(
		childProcessLocation,
		files,
		options.batch,
		{
			modules
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

export async function startParentProcess(input: string[], childProcessLocation: string) {
	// Prepare an event listener and let all reporters add their listeners
	const events = new EventEmitter();
	try {
		await evaluateAll(events, input, childProcessLocation);
	} catch (error) {
		console.log('---');
		npmlog.disableProgress();
		process.exitCode = 1;
		events.emit('error', error);
		return;
	}

	events.emit('end', process.exitCode);
}
