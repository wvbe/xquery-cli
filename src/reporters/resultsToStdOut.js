const npmlog = require('npmlog');
const os = require('os');

npmlog.addLevel('rawOutput', 999999, {}, ' ');

function stringifyResult(result) {
	if (!result) {
		return result;
	}
	if (typeof result === 'string' || typeof result === 'number') {
		return result;
	}

	if (Array.isArray(result)) {
		return result.map((res) => stringifyResult(res)).join(os.EOL);
	}

	if (typeof result === 'object' && Object.keys(result).length > 0) {
		return Object.keys(result)
			.map((key) => result[key])
			.join('\t');
	}

	return result;
}

module.exports = (events, stream) => {
	events.on('result', ({ $value, $error }) => {
		if ($error) {
			// An error occurred, but we're not logging that here
			return;
		}
		const previousStream = npmlog.stream;
		npmlog.stream = stream;
		npmlog.rawOutput(null, stringifyResult($value));
		npmlog.stream = previousStream;
	});
	events.on('file', (file, i) => {
		if (file.$error) {
			// An error occurred, but we're not logging that here
			return;
		}
		npmlog.clearProgress();
		file.$value.forEach((value) => {
			console.log(stringifyResult(value));
		});
		npmlog.showProgress();
	});
};
