/**
 * XPath/XQuery typing
 */
export type FontoxpathOptions = object;

export type XqueryModule = {
	contents: string;
};

export type XqueryModules = {
	libraries: XqueryModule[];
	main: XqueryModule;
};

export type XqueryResult<SerializedNode = false> =
	| number
	| string
	| (SerializedNode extends false ? Node : SerializedNode)
	| { [key: string]: XqueryResult<SerializedNode> }
	| XqueryResult<SerializedNode>[];

/**
 * Serializing content across the parent- and child processes:
 */
export type SerializableResult = XqueryResult<{ [key: string]: SerializableResult }>;

export type SerializableError = {
	message: string | null;
	stack: string | null;
};

export type SerializableErrorMessage = {
	$error: SerializableError;
	$value: null;
};
export type SerializableResultMessage = {
	$error: null;
	$value: SerializableResult[];
};

export type ContextlessResultEvent = SerializableErrorMessage | SerializableResultMessage;

export type FileResultEvent = {
	$fileName: string;
	$fileNameBase?: string;
} & ContextlessResultEvent;

export type ChildProcessInstructionRun = {
	type: 'run';
	files: string[];
	data: {
		modules: XqueryModules;
	};
};

export type ChildProcessInstructionKill = {
	type: 'kill';
};

/**
 * Confguration object
 */
export type FileIterator = (
	modules: XqueryModules,
	fileName: string,
	index: number,
	allFileNames: string[]
) => Promise<void>;
