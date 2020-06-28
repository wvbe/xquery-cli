const npmlog = require('npmlog');

module.exports = (req, events, _stream) => {
	const timeStartGlob = Date.now();
	const stats = {
		files: null,
	};

	npmlog.level = req.options['log-level'];

	events.on('files', (files) => {
		stats.files = files.length;

		npmlog.info(
			null,
			'Located %s files in %s milliseconds',
			stats.files,
			Date.now() - timeStartGlob
		);
	});
	events.on('file', (file, i) => {
		npmlog.verbose(null, 'Evaluated file\n    %s', file.$fileName);
	});

	events.on('modules', (modules) => {
		npmlog.info(
			null,
			'Using %s main and %s library XQuery modules',
			modules.main ? 1 : 0,
			modules.libraries.length
		);
	});

	events.on('expression', (expression) =>
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

	let totalProcessed = 0;

	events.on('file', (file, i) => {
		npmlogItem.name = ++totalProcessed + ' of ' + stats.files;
		npmlogItem.completeWork(1);

		// It's possible the file could not be read, parsed or other
		if (file.$error) {
			npmlog.error(`Runtime error in evaluating file`);
			npmlog.error(`    ${file.$fileName}`);
			(file.$error.stack || file.$error.message)
				.split('\n')
				.forEach((line) => npmlog.error(line));
			return;
		}
	});

	events.on('end', (exitCode) => {
		stats.totalTime = Date.now() - timeStartAnalysis;

		const msPerDocument = (stats.totalTime / stats.files).toFixed(2);
		const documentPerSecond = ((stats.files / stats.totalTime) * 1000).toFixed(2);

		npmlog.disableProgress();

		if (timeStartAnalysis) {
			npmlog.info(
				null,
				'Evaluated %s files in %s milliseconds',
				stats.files,
				stats.totalTime
			);
			npmlog.verbose(null, '%s milliseconds per document', msPerDocument);
			npmlog.verbose(null, '%s documents per second', documentPerSecond);
		} else {
			npmlog.info(null, 'Quitting before a query was evaluated');
		}

		if (exitCode > 0) {
			npmlog.error('There were some errors, exiting with a non-zero code.');
		}
	});
};
