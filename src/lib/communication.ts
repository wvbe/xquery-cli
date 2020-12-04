import ChildProcess from 'child_process';
import { loadModule } from 'fontoxpath-module-loader';
import {
	ChildProcessInstructionKill,
	ChildProcessInstructionRun,
	FileIterator,
	FileResultEvent
} from '../types';

export const createChildProcessHandler = (mapIterator: FileIterator) => {
	return async (message: ChildProcessInstructionRun | ChildProcessInstructionKill) => {
		try {
			if (!process.send) {
				throw new Error('Not running from a child process');
			}
			if (message.type === 'run') {
				const {
					files,
					data: { modules }
				} = message;
				modules.libraries.forEach(loadModule);

				await Promise.all(files.map((...rest) => mapIterator(modules, ...rest)));

				process.send(null);
				return;
			}
			if (message.type === 'kill') {
				process.exit();
			}
			// No other message types exist.
		} catch (error) {
			console.error('> Encountered an unexpected error in xquery-cli child process:');
			console.error('> ' + error.stack);
			process.exitCode = 1;
			process.exit();
		}
	};
};

// Serially send a bunch of file names off to a child process and call onResult every time there's a result
export const evaluateInChildProcesses = (
	childProcessFile: string,
	files: string[],
	batchSize = Infinity,
	data = {},
	onResult: (message: FileResultEvent, index: number) => void
) =>
	(async function readNextBatch(fileList) {
		const currentSlice = fileList.length > batchSize ? fileList.slice(0, batchSize) : fileList;
		const nextSlice = fileList.length > batchSize ? fileList.slice(batchSize) : [];

		let i = 0;
		const child = ChildProcess.fork(childProcessFile);

		child.on('message', (message: FileResultEvent) => {
			if (message) {
				return onResult(message, i++);
			}

			// An empty message means end of transmission
			child.send({
				type: 'kill'
			} as ChildProcessInstructionKill);
		});

		child.send({
			type: 'run',
			files: currentSlice,
			data
		} as ChildProcessInstructionRun);

		await new Promise((resolve, reject) => {
			child.on('close', exitCode => (exitCode ? reject(exitCode) : resolve()));
		});

		if (nextSlice.length) {
			await readNextBatch(nextSlice);
		}
	})(files);
