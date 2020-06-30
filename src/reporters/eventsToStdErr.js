const npmlog = require('npmlog');

module.exports = (events, _stream) => {
	const timeStartGlob = Date.now();
	const stats = {
		files: null,
	};

	events.on('files', (files) => {
		stats.files = files.length;

		npmlog.info(
			null,
			'Located %s files in %s milliseconds',
			stats.files,
			Date.now() - timeStartGlob
		);
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
		npmlog.info(null, `Starting evaluation`);

		npmlogItem = npmlog.newItem('0 of ' + stats.files, stats.files);
		timeStartAnalysis = Date.now();
	});

	let totalProcessed = 0;
	let totalErrors = 0;

	function logError(caption, error) {
		++totalErrors;
		npmlog.error(caption);
		(error.stack || error.message)
			.split('\n')
			.forEach((line, i) => (i ? npmlog.error(null, line) : npmlog.error(line)));
	}

	events.on('error', (error) => {
		logError('Fatal error in program', error);
	});

	events.on('result', ({ $value, $error }) => {
		if ($error) {
			return logError('Error in expression evaluation', $error);
		}
	});

	events.on('file', (file, i) => {
		npmlog.verbose(null, 'Evaluated %s', file.$fileName);

		npmlogItem.name = ++totalProcessed + ' of ' + stats.files;
		npmlogItem.completeWork(1);

		if (file.$error) {
			return logError('Error in file evaluation', file.$error);
		}
	});

	events.on('end', (exitCode) => {
		stats.totalTime = Date.now() - timeStartAnalysis;

		const msPerDocument = (stats.totalTime / totalProcessed).toFixed(2);
		const documentPerSecond = ((totalProcessed / stats.totalTime) * 1000).toFixed(2);

		npmlog.disableProgress();

		if (timeStartAnalysis && stats.files) {
			npmlog.info(
				null,
				'Evaluated %s out of %s files in %s milliseconds',
				totalProcessed,
				stats.files,
				stats.totalTime
			);
			npmlog.verbose(null, '%s milliseconds per document', msPerDocument);
			npmlog.verbose(null, '%s documents per second', documentPerSecond);
		} else if (timeStartAnalysis && !stats.files) {
			npmlog.info(null, 'Evaluated expression in %s milliseconds', stats.totalTime);
		} else {
			npmlog.info(null, 'Quitting before a query was evaluated');
		}
		npmlog.info(null, 'Encountered %s errors', totalErrors);

		if (exitCode > 0) {
			npmlog.info(null, 'Exiting process with a non-zero code.');
		}
	});
};
