const evaluateForFileName = require('../src/evaluateForFileName');
const { createChildProcessHandler } = require('../src/childProcessCommunication');

process.on(
	'message',
	createChildProcessHandler(async (modules, fileName) => {
		try {
			process.send({
				$fileName: fileName,
				$value: await evaluateForFileName(
					modules,
					fileName,
					{ 'document-uri': fileName },
					{ debug: true }
				),
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
