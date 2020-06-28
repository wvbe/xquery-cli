'use strict';

const fs = require('fs');
const { sync, slimdom } = require('slimdom-sax-parser');
const { loadModule, fontoxpath } = require('fontoxpath-module-loader');

module.exports = evaluateForFileName;

function serializeResult(result) {
	// console.dir(result, { depth: 0 });

	if (result instanceof slimdom.Node) {
		return slimdom.serializeToWellFormedString(result);
	}

	return result;
}

async function evaluateForFileName(modules, fileName) {
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

	return (Array.isArray(xdmValue) ? xdmValue : [xdmValue]).map(serializeResult);
}
