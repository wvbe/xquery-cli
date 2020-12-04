import { CrossProcessResultMessage, SerializableQueryResult } from './../../types.d';
import { EventEmitter } from 'events';
import npmlog from 'npmlog';
import os from 'os';
import { CrossProcessErrorMessage } from '../../types';

npmlog.addLevel('rawOutput', 999999, {}, ' ');

function stringifyResult(result: SerializableQueryResult): string | number {
	if (!result) {
		return result;
	}
	if (typeof result === 'string' || typeof result === 'number') {
		return result;
	}

	if (Array.isArray(result)) {
		return result.map(res => stringifyResult(res)).join(os.EOL);
	}

	if (typeof result === 'object') {
		return Object.keys(result)
			.map((key: string) => result[key])
			.join('\t');
	}

	return result;
}

export default (events: EventEmitter, stream: NodeJS.WriteStream) => {
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

	events.on('file', (file: CrossProcessResultMessage | CrossProcessErrorMessage) => {
		if (file.$error) {
			// An error occurred, but we're not logging that here
			return;
		}
		npmlog.clearProgress();
		file.$value.forEach(value => {
			npmlog.rawOutput(null, stringifyResult(value));
		});
		npmlog.showProgress();
	});
};
