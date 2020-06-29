'use strict';

const fs = require('fs');
const { sync } = require('slimdom-sax-parser');
const evaluateForModules = require('./evaluateForModules');

module.exports = async function evaluateUpdatingExpressionForFileName(
	modules,
	fileName,
	variables,
	options
) {
	const content = await new Promise((resolve, reject) =>
		fs.readFile(fileName, 'utf8', (error, data) => (error ? reject(error) : resolve(data)))
	);
	const dom = sync(content);
	return evaluateForModules(modules, dom, variables, options);
};
