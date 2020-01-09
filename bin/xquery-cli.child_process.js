'use strict';

const fs = require('fs');
const { sync } = require('slimdom-sax-parser');
const { evaluateXPath, registerXQueryModule } = require('fontoxpath');

async function validateFile(expression, fileName) {
	try {
		const content = await new Promise((resolve, reject) =>
			fs.readFile(fileName, 'utf8', (error, data) => (error ? reject(error) : resolve(data)))
		);
		const dom = sync(content);
		const value = evaluateXPath(expression, dom, null, {}, null, {
			language: evaluateXPath.XQUERY_3_1_LANGUAGE,
			debug: true
		});
		process.send({
			$fileName: fileName,
			$value: Array.isArray(value) ? value : [value]
		});
	} catch (error) {
		process.send({
			$fileName: fileName,
			$error: {
				message: error.message
			}
		});
	}
}

process.on('message', async message => {
	if (message.type === 'run') {
		message.modules
			.filter(mod => !mod.main)
			.forEach(mod => registerXQueryModule(mod.contents, { debug: false }));

		await Promise.all(message.fileList.map(validateFile.bind(null, message.expression)));
		process.send(null);
		return;
	}

	if (message.type === 'kill') {
		process.exit();
		return;
	}

	console.log('Unknown message type', message);
	process.exit(1);
	return;
});
