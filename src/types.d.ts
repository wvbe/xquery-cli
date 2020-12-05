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

export type SerializableResult = XqueryResult<{ [key: string]: SerializableResult }>;

export type SerializableError = {
	message: string | null;
	stack: string | null;
};

export type FileResultEvent = {
	$fileName: string;
	$fileNameBase?: string;
	$error: null | SerializableError;
	$value: null | SerializableResult[];
};

export type ContextlessResultEvent = {
	$error: SerializableError | null;
	$value: SerializableResult[] | null;
};

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

export type FileIterator = (
	modules: XqueryModules,
	fileName: string,
	index: number,
	allFileNames: string[]
) => Promise<void>;
