const npmlog = require('npmlog');

function add(a, b) {
	if (typeof a !== typeof b) {
		return;
		throw new Error(`Trying to add data of different types: ${typeof a} + ${typeof b}`);
	}
	if (typeof a === 'number') {
		a += b;
		return a;
	} else if (!b) {
		throw new Error('Trying to add a null value');
	} else if (Array.isArray(a)) {
		if (a.length !== b.length) {
			throw new Error(
				`Trying to add arrays of different lengths: ${a.length} vs ${b.length}`
			);
		}
		return a.map((x, i) => add(x, b[i]));
	} else if (typeof a === 'object') {
		if (Object.keys(a).length !== Object.keys(b).length) {
			throw new Error(
				`Trying to add objects of different key lengths: ${Object.keys(a).length} vs ${
					Object.keys(b).length
				}`
			);
		}
		Object.keys(a).forEach(x => {
			a[x] = add(a[x], b[x]);
		});

		return a;
	}

	return;
	throw new Error('Unexpected data type');
}

module.exports = (req, events, _stream) => {
	let accumulated = null;

	switch (req.options['post-process']) {
		case 'total':
			events.on('file', (file, i) => {
				if (!file.$value) {
					// An error occurred, but we're not logging that here
					return;
				}
				file.$value.forEach(result => {
					if (accumulated === null) {
						accumulated = result;
						return;
					}
					try {
						add(accumulated, result);
					} catch (error) {
						npmlog.error(error);
					}
				});
			});

			events.on('end', () => {
				console.log(JSON.stringify(accumulated, null, '  '));
			});
			return;
		default:
			throw new Error('Unknown post processor');
	}
};
