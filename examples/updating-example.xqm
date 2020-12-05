import module namespace uf = "https://example/updating-functions" at "./updating-functions.xql";

(:~
	Provided by xquery-cli:
~:)
declare variable $document-uri as xs:string external;

uf:replace-node-with-crap(
	/*,
	concat('Replaced the root node in "', $document-uri, '"')
)