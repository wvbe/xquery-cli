'use strict';

const fs = require('fs/promises');
const { sync, slimdom } = require('slimdom-sax-parser');
const evaluateUpdatingExpressionForModules = require('./evaluateForModules');

module.exports = async function evaluateUpdatingExpressionForFileName(
	modules,
	fileName,
	variables,
	options
) {
	const content = await fs.readFile(fileName, 'utf8');
	const dom = sync(content);
	const { returnValue, isUpdating } = await evaluateUpdatingExpressionForModules(
		modules,
		dom,
		variables,
		options
	);

	if (isUpdating) {
		fs.writeFile(fileName, slimdom.serializeToWellFormedString(dom), 'utf8');
	}

	return returnValue;
};
