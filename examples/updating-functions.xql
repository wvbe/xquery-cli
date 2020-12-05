module namespace uf = "https://example/updating-functions";

declare %updating function uf:replace-node-with-crap (
	$n as node(),
	$d as xs:string
) as xs:string {
	(
		if ($n) then
			replace node $n with <foobar replaced="true" />
		else
			()
	), $d
};