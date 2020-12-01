module namespace lib1 = "https://lib/1";

declare %updating function lib1:xquf ($n, $d) as xs:string {
	(
		if ($n) then
			replace node $n with <fodo />
		else
			()
	), $d
};