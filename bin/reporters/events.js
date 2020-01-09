const npmlog = require('npmlog');

// Configure the npmlog object
npmlog.prefixStyle = {};

npmlog.addLevel('verbose', 1000, { fg: 'blue', bg: 'black' }, 'verb')
npmlog.addLevel('info', 2000, { fg: 'green' })
npmlog.addLevel('file', 2501, { fg: 'grey' }, 'file');
npmlog.addLevel('error', 5000, { fg: 'red', bg: 'black' }, 'ERR!');

module.exports = (req, events, _stream) => {
	const timeStartGlob = Date.now();
	const stats = {
		files: null
	};

	npmlog.level = req.options['log-level'];

	events.on('files', files => {
		stats.files = files.length;

		npmlog.info(
			null,
			'Located %s files in %s milliseconds',
			stats.files,
			Date.now() - timeStartGlob
		);
	});

	events.on('modules', modules => npmlog.info(null, 'Using %s XQuery modules', modules.length));

	events.on('expression', expression =>
		npmlog.verbose(null, 'Using expression:\n%s', expression)
	);

	let npmlogItem = null;
	let timeStartAnalysis = null;
	events.on('start', () => {
		npmlog.enableProgress();
		npmlog.info(null, `Starting validation`);

		npmlogItem = npmlog.newItem('0 of ' + stats.files, stats.files);
		timeStartAnalysis = Date.now();
	});

	events.on('file', (file, i) => {
		npmlogItem.name = i + 1 + ' of ' + stats.files;
		npmlogItem.completeWork(1);

		// npmlog.file(null, file.$fileNameBase);

		// It's possible the file could not be read, parsed or other
		if (file.$error) {
			npmlog.error(file.$error.message);
			return;
		}

		// file.$value.forEach(result => {
		// 	npmlog.data(result);
		// });
	});

	events.on('end', exitCode => {
		stats.totalTime = Date.now() - timeStartAnalysis;

		const msPerDocument = (stats.totalTime / stats.files).toFixed(2);
		const documentPerSecond = ((stats.files / stats.totalTime) * 1000).toFixed(2);

		npmlog.disableProgress();

		npmlog.info(null, 'Done in %s milliseconds', stats.totalTime);
		npmlog.verbose(null, '%s milliseconds per document', msPerDocument);
		npmlog.verbose(null, '%s documents per second', documentPerSecond);

		if (exitCode > 0) {
			npmlog.error('Not all documents passed, exiting with non-zero code');
		}
	});
};
