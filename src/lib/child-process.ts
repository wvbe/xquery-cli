import { fontoxpath } from 'fontoxpath-module-loader';
import fs from 'fs/promises';
import { slimdom, sync } from 'slimdom-sax-parser';

import {
	ChildProcessInstructionRun,
	FileResultEvent,
	FontoxpathOptions,
	SerializableNode,
	SerializableResult,
	XqueryModules,
	XqueryResult,
} from '../types';
import { createChildProcessHandler } from './communication';

function serializeResult(result: XqueryResult): SerializableResult {
	if (result instanceof slimdom.Node) {
		const position = (
			result as unknown as {
				position?: { line: number; column: number; start: number; end: number };
			}
		).position;
		return {
			$$$position: position ? position : null,
			$$$string: slimdom.serializeToWellFormedString(result as any),
		} as SerializableNode;
	}

	if (Array.isArray(result)) {
		return result.map((res) => serializeResult(res));
	}

	if (result instanceof Date) {
		return result.toISOString();
	}
	if (typeof result === 'object') {
		return Object.keys(result).reduce(
			(obj, key: string) =>
				Object.assign(obj, {
					[key]: serializeResult((result as { [key: string]: any })[key]),
				}),
			{},
		);
	}

	// Note: No other protection against circular objects

	return result;
}

export async function evaluateUpdatingExpressionOnNode(
	modules: XqueryModules,
	contextNode: Node | null,
	variables: object,
	options: FontoxpathOptions,
) {
	const { pendingUpdateList, xdmValue } = await fontoxpath.evaluateUpdatingExpression(
		modules.main.contents,
		contextNode || new slimdom.Document(),
		null,
		variables,
		options,
	);

	fontoxpath.executePendingUpdateList(pendingUpdateList);

	return {
		isUpdating: !!pendingUpdateList.length,
		returnValue: (Array.isArray(xdmValue) ? xdmValue : [xdmValue]).map(serializeResult),
	};
}

async function evaluateUpdatingExpressionOnFile(
	options: ChildProcessInstructionRun,
	fileName: string,
	variables: object,
	fontoxpathOptions: FontoxpathOptions,
) {
	const content = await fs.readFile(fileName, 'utf8');
	const dom = sync(content, {
		position: options.usePositionTracking,
	});
	const result = await evaluateUpdatingExpressionOnNode(
		options.modules,
		dom as unknown as Node,
		variables,
		fontoxpathOptions,
	);

	if (result.isUpdating && !options.isDryRun) {
		fs.writeFile(fileName, slimdom.serializeToWellFormedString(dom), 'utf8');
	}

	return result;
}

export function startChildProcess() {
	process.on(
		'message',
		createChildProcessHandler(async function onEvaluateFile(options, fileName) {
			if (!process.send) {
				throw new Error('Not running from a child process');
			}
			try {
				const { returnValue, isUpdating } = await evaluateUpdatingExpressionOnFile(
					options,
					fileName,
					{ 'document-uri': fileName },
					{ debug: true },
				);
				process.send({
					$fileName: fileName,
					$error: null,
					$value: returnValue,
					$isUpdate: isUpdating,
				} as FileResultEvent);
			} catch (error: unknown) {
				process.send({
					$fileName: fileName,
					$error: {
						message: (error as Error).message || null,
						stack: (error as Error).stack || null,
					},
					$value: null,
					$isUpdate: false,
				} as FileResultEvent);
			}
		}),
	);
}
