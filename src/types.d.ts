type Options = {
	files: string[];
	modules: XqueryModules;
	hasGlobbed: boolean;
	hasLocations: boolean;
	hasEventLogging: boolean;
	hasResultLogging: boolean;
	isDryRun: boolean;
	usePositionTracking: boolean;
	batchSize: number;
};

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

type SerializableNodePosition = {
	line: number;
	column: number;
	start: number;
	end: number;
};

/**
 * A DOM node, but ready to be JSON encoded.
 */
type SerializableNode = {
	$$$position: SerializableNodePosition | null;
	$$$string: string;
};

/**
 * Serializing content across the parent- and child processes:
 */
export type SerializableResult = XqueryResult<SerializableNode>;

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
	$isUpdate: boolean;
} & ContextlessResultEvent;

export type ChildProcessInstructionRun = {
	type: 'run';
} & Options;

export type ChildProcessInstructionKill = {
	type: 'kill';
};

/**
 * Confguration object
 */
export type FileIterator = (
	options: ChildProcessInstructionRun,
	fileName: string,
	index: number,
) => Promise<void>;
