import ChildProcess from 'child_process';
import { loadModule } from 'fontoxpath-module-loader';

import {
	ChildProcessInstructionKill,
	ChildProcessInstructionRun,
	FileIterator,
	FileResultEvent,
	Options,
} from '../types';

export const createChildProcessHandler = (onEvaluateFile: FileIterator) => {
	return async (instruction: ChildProcessInstructionRun | ChildProcessInstructionKill) => {
		try {
			if (!process.send) {
				throw new Error('Not running from a child process');
			}
			if (instruction.type === 'run') {
				const { files, modules } = instruction;
				modules.libraries.forEach(loadModule);

				await Promise.all(
					files.map((fileName, index) => onEvaluateFile(instruction, fileName, index)),
				);

				process.send(null);
				return;
			}
			if (instruction.type === 'kill') {
				process.exit();
			}
			// No other message types exist.
		} catch (error: unknown) {
			console.error('> Encountered an unexpected error in xquery-cli child process:');
			console.error('> ' + (error as Error).stack);
			process.exitCode = 1;
			process.exit();
		}
	};
};

// Serially send a bunch of file names off to a child process and call onResult every time there's a result
export const evaluateInChildProcesses = (
	childProcessFile: string,
	options: Options,
	onResult: (message: FileResultEvent, index: number) => void,
) =>
	(async function readNextBatch(fileList) {
		const currentSlice =
			fileList.length > options.batchSize ? fileList.slice(0, options.batchSize) : fileList;
		const nextSlice = fileList.length > options.batchSize ? fileList.slice(options.batchSize) : [];

		let i = 0;
		const child = ChildProcess.fork(childProcessFile);

		child.on('message', (message: FileResultEvent) => {
			if (message) {
				return onResult(message, i++);
			}

			// An empty message means end of transmission
			child.send({
				type: 'kill',
			} as ChildProcessInstructionKill);
		});

		child.send({
			type: 'run',
			...options,
			files: currentSlice,
		} as ChildProcessInstructionRun);

		await new Promise((resolve, reject) => {
			child.on('close', (exitCode) => (exitCode ? reject(exitCode) : resolve(null)));
		});

		if (nextSlice.length) {
			await readNextBatch(nextSlice);
		}
	})(options.files);
