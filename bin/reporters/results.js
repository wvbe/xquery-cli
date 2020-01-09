function stringifyResult(result) {
	if (!result) {
		return result;
	}
	if (typeof result === 'string' || typeof result === 'number') {
		return result;
	}

	if (Array.isArray(result)) {
		throw new Error('Beep boop baap nerf');
		return result.map(res => stringifyResult(res));
	}

	if (typeof result === 'object' && result.nodeType === 1) {
		return result.outerHTML;
	}

	if (typeof result === 'object' && Object.keys(result).length > 0) {
		return Object.keys(result)
			.map(key => result[key])
			.join('\t');
	}

	return result;
}

module.exports = (_req, events, _stream) => {
	events.on('file', (file, i) => {
		file.$value.forEach(result => {
			console.log(stringifyResult(result));
		});
	});
};
