#!/usr/bin/env node
const { startParentProcess, startChildProcess } = require('../dist');

if (!process) {
	throw new Error();
}

if (process.send) {
	startChildProcess();
} else {
	startParentProcess(process.argv.splice(2), __filename);
}
