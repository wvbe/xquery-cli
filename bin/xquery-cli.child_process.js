'use strict';

const fs = require('fs');
const { sync, slimdom } = require('slimdom-sax-parser');
const { loadModule, fontoxpath } = require('fontoxpath-module-loader');

function serializeResult(result) {
	if (result instanceof slimdom.Node) {
		return slimdom.serializeToWellFormedString(result);
	}

	return result;
}

async function runQuery(modules, fileName) {
	try {
		const content = await new Promise((resolve, reject) =>
			fs.readFile(fileName, 'utf8', (error, data) => (error ? reject(error) : resolve(data)))
		);
		const dom = sync(content);
		const { pendingUpdateList, xdmValue } = await fontoxpath.evaluateUpdatingExpression(
			modules.main.contents,
			dom,
			null,
			{ 'document-uri': fileName },
			{ debug: true }
		);

		// @TODO Save if there were updates
		// fontoxpath.executePendingUpdateList(pendingUpdateList);

		process.send({
			$fileName: fileName,
			$value: (Array.isArray(xdmValue) ? xdmValue : [xdmValue]).map(serializeResult)
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
		message.modules.libraries.forEach(loadModule);

		await Promise.all(message.fileList.map(runQuery.bind(null, message.modules)));
		process.send(null);
		return;
	}

	if (message.type === 'kill') {
		process.exit();
		return;
	}

	console.log('Unknown message type', message);
	process.exit(1);
});
