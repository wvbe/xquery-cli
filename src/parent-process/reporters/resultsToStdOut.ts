import { EventEmitter } from 'events';
import npmlog from 'npmlog';
import os from 'os';
import { FileResultEvent, ContextlessResultEvent, SerializableResult } from './../../types.d';

npmlog.addLevel('rawOutput', 999999, {}, ' ');

function stringifyResult(result: SerializableResult): string | number {
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
	events.on('result', ({ $value, $error }: ContextlessResultEvent) => {
		if ($error) {
			// An error occurred, but we're not logging that here
			return;
		}
		if ($value) {
			const previousStream = npmlog.stream;
			npmlog.stream = stream;
			npmlog.rawOutput(null, stringifyResult($value));
			npmlog.stream = previousStream;
		}
	});

	events.on('file', ({ $value, $error }: FileResultEvent) => {
		if ($error) {
			// An error occurred, but we're not logging that here
			return;
		}
		if ($value) {
			npmlog.clearProgress();
			$value.forEach(value => {
				npmlog.rawOutput(null, stringifyResult(value));
			});
			npmlog.showProgress();
		}
	});
};
