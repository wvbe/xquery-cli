export type XqueryModule = {
	contents: string;
};

type QueryResult = number | string | Node | { [key: string]: QueryResult } | QueryResult[];

type SerializableQueryResult =
	| number
	| string
	| { [key: string]: SerializableQueryResult }
	| SerializableQueryResult[];

type FontoxpathOptions = object;
export type ModuleList = {
	libraries: XqueryModule[];
	main: XqueryModule;
};

export type CrossProcessErrorObject = {
	message: string | null;
	stack: string | null;
};
export type CrossProcessErrorMessage = {
	$fileName: string;
	$fileNameBase?: string;
	$error: CrossProcessErrorObject;
	$value: null;
};

export type CrossProcessResultMessage = {
	$fileName: string;
	$fileNameBase?: string;
	$error: null;
	$value: SerializableQueryResult[];
};
export type ChildProcessInstructionRun = {
	type: 'run';
	files: string[];
	data: {
		modules: ModuleList;
	};
};

export type ChildProcessInstructionKill = {
	type: 'kill';
};

export type MapIterator = (
	modules: ModuleList,
	fileName: string,
	index: number,
	allFileNames: string[]
) => Promise<void>;
