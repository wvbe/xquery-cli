const fs = require('fs');
const path = require('path');

// Matches a namespace prefix and url from the module declaration
const MATCH_MODULE_NS_FROM_STRING = /(?:\n|^)module namespace ([a-z]*) = "(.*)"/m;

const LOCATION_BY_NAMESPACE_URL = {
	// 'https://github.com/wvbe/xml-generator/ns': path.resolve(__dirname, '..', 'generator.xql'),
	// 'https://github.com/wvbe/xml-generator/ns/dita': path.resolve(
	// 	__dirname,
	// 	'..',
	// 	'examples',
	// 	'xquery-libraries',
	// 	'dita.xql'
	// ),
	// 'https://github.com/wvbe/xml-generator/ns/jats': path.resolve(
	// 	__dirname,
	// 	'..',
	// 	'examples',
	// 	'xquery-libraries',
	// 	'jats.xql'
	// )
};

function getXQueryModulesInSourceOrder(location, asMainModule) {
	const MATCH_IMPORTED_MODULE_NS_FROM_STRING = /(?:\n|^)import module namespace ([a-z]*) = "([^"]*)"(?: at "([^"]*)")?;/gm;

	let modules = [];
	const contents = fs.readFileSync(location, 'utf8');

	const namespaceInfo = MATCH_MODULE_NS_FROM_STRING.exec(contents);
	if (!asMainModule && !namespaceInfo) {
		throw new Error('Could not extract namespace info from XQuery module\n' + location);
	}

	const dependencies = [];
	let match = [];
	while ((match = MATCH_IMPORTED_MODULE_NS_FROM_STRING.exec(contents)) !== null) {
		const [_occurrence, importPrefix, importUrl, importLocation] = match;
		dependencies.push(importUrl);

		// @TODO guard against circular dependencies?

		if (LOCATION_BY_NAMESPACE_URL[importUrl]) {
			modules = modules.concat(
				getXQueryModulesInSourceOrder(LOCATION_BY_NAMESPACE_URL[importUrl])
			);
		} else if (importLocation) {
			modules = modules.concat(
				getXQueryModulesInSourceOrder(path.resolve(path.dirname(location), importLocation))
			);
		} else {
			modules.push({
				contents: `module namespace ${importPrefix} = "${importUrl}";`,
				dependencies: [],
				location: null,
				main: false,
				prefix: importPrefix,
				unresolved: true,
				url: importUrl
			});
		}
	}

	const [_match, prefix, url] = namespaceInfo || [];
	modules.push({
		contents,
		dependencies,
		location,
		main: !!asMainModule,
		prefix,
		unresolved: false,
		url
	});

	return modules.filter((mod, i, all) => all.findIndex(m => m.url === mod.url) === i);
}

function getXQueryModulesInDependencyOrder(location) {
	const modulesInRandomOrder = getXQueryModulesInSourceOrder(location, true);
	const modulesInDependencyOrder = [];

	let safety = modulesInRandomOrder.length;
	while (modulesInRandomOrder.length) {
		if (--safety < 0) {
			throw new Error(
				`Could not resolve dependencies for ${modulesInRandomOrder.length} modules:\n\t` +
					modulesInRandomOrder.map(m => m.url)
			);
		}
		const nextModuleWithoutUnresolvedDependencies = modulesInRandomOrder.find(mod =>
			mod.dependencies.every(dep => modulesInDependencyOrder.find(m => m.url === dep))
		);
		modulesInRandomOrder.splice(
			modulesInRandomOrder.indexOf(nextModuleWithoutUnresolvedDependencies),
			1
		);
		modulesInDependencyOrder.push(nextModuleWithoutUnresolvedDependencies);
	}

	return modulesInDependencyOrder;
}

module.exports.getXQueryModulesInDependencyOrder = getXQueryModulesInDependencyOrder;
