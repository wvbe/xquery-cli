'use strict';

const fs = require('fs');
const { sync, slimdom } = require('slimdom-sax-parser');
const { loadModule, fontoxpath } = require('fontoxpath-module-loader');

const evaluateForFileName = require('../src/evaluateForFileName');

process.on('message', async (message) => {
	if (message.type === 'run') {
		const { modules } = message;
		modules.libraries.forEach(loadModule);

		await Promise.all(
			message.fileList.map(async (fileName) => {
				try {
					process.send({
						$fileName: fileName,
						$value: await evaluateForFileName(modules, fileName),
					});
				} catch (error) {
					process.send({
						$fileName: fileName,
						$error: {
							message: error.message || null,
							stack: error.stack || null,
						},
					});
				}
			})
		);

		process.send(null);
		return;
	}

	if (message.type === 'kill') {
		process.exit();
		return;
	}

	console.log('Unknown message type', message);
	process.exitCode = 1;
	process.exit();
});
