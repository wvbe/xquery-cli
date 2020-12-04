import { fontoxpath } from 'fontoxpath-module-loader';
import fs from 'fs/promises';
import { slimdom, sync } from 'slimdom-sax-parser';
import { createChildProcessHandler } from './communication';
import {
	CrossProcessErrorMessage,
	CrossProcessResultMessage,
	FontoxpathOptions,
	ModuleList,
	QueryResult,
	SerializableQueryResult
} from './types';

function serializeResult(result: QueryResult): SerializableQueryResult {
	if (result instanceof slimdom.Node) {
		return slimdom.serializeToWellFormedString(result as any);
	}

	if (Array.isArray(result)) {
		return result.map(res => serializeResult(res));
	}

	if (typeof result === 'object') {
		return Object.keys(result).reduce(
			(obj, key: string) =>
				Object.assign(obj, {
					[key]: serializeResult((result as { [key: string]: any })[key])
				}),
			{}
		);
	}

	// Note: No other protection against circular objects

	return result;
}

export async function evaluateUpdatingExpressionOnNode(
	modules: ModuleList,
	contextNode: Node | null,
	variables: object,
	options: FontoxpathOptions
) {
	const { pendingUpdateList, xdmValue } = await fontoxpath.evaluateUpdatingExpression(
		modules.main.contents,
		contextNode || new slimdom.Document(),
		null,
		variables,
		options
	);

	fontoxpath.executePendingUpdateList(pendingUpdateList);

	return {
		isUpdating: !!pendingUpdateList.length,
		returnValue: (Array.isArray(xdmValue) ? xdmValue : [xdmValue]).map(serializeResult)
	};
}

async function evaluateUpdatingExpressionOnFile(
	modules: ModuleList,
	fileName: string,
	variables: object,
	options: FontoxpathOptions
): Promise<SerializableQueryResult[]> {
	const content = await fs.readFile(fileName, 'utf8');
	const dom = sync(content);
	const { returnValue, isUpdating } = await evaluateUpdatingExpressionOnNode(
		modules,
		(dom as unknown) as Node,
		variables,
		options
	);

	if (isUpdating) {
		fs.writeFile(fileName, slimdom.serializeToWellFormedString(dom), 'utf8');
	}

	return returnValue;
}

export function startChildProcess() {
	process.on(
		'message',
		createChildProcessHandler(async (modules, fileName) => {
			if (!process || !process.send) {
				throw new Error('Not running from a NodeJS environment');
			}
			try {
				process.send({
					$fileName: fileName,
					$error: null,
					$value: await evaluateUpdatingExpressionOnFile(
						modules,
						fileName,
						{ 'document-uri': fileName },
						{ debug: true }
					)
				} as CrossProcessResultMessage);
			} catch (error) {
				process.send({
					$fileName: fileName,
					$error: {
						message: error.message || null,
						stack: error.stack || null
					},
					$value: null
				} as CrossProcessErrorMessage);
			}
		})
	);
}
