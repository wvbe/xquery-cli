const { slimdom } = require('slimdom-sax-parser');
const { fontoxpath } = require('fontoxpath-module-loader');

function serializeResult(result) {
	if (result instanceof slimdom.Node) {
		return slimdom.serializeToWellFormedString(result);
	}

	// Note: No other protection against circular objects

	return result;
}

module.exports = async function evaluateUpdatingExpressionForModules(
	modules,
	contextNode,
	variables,
	options
) {
	const {
		// pendingUpdateList,
		xdmValue,
	} = await fontoxpath.evaluateUpdatingExpression(
		modules.main.contents,
		contextNode,
		null,
		variables,
		options
	);

	// @TODO Save if there were updates
	// fontoxpath.executePendingUpdateList(pendingUpdateList);

	return (Array.isArray(xdmValue) ? xdmValue : [xdmValue]).map(serializeResult);
};
