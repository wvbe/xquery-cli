# XML generator

Generate a bunch of lorem-ipsum XML documents for testing one software or another. Uses XQuery modules and provides a
library for interacting with `fs` and `lorem-ipsum`.

## Step 1: Have an XQuery module

Write one for whichever XML structure you want to generate. You can import and use the
`https://github.com/wvbe/xml-generator/ns` namespace for functions to generate randomized data as well as writing stuff
to disk.

For example, `my-module.xqm`:

```xquery
import module namespace generator = "https://github.com/wvbe/xml-generator/ns";

generator:create-document-for-node(
	$destination,
	<nerf>
		<title>Random XML test</title>
		<p>{generator:random-phrase()}</p>
	</nerf>
)
```

Feel free to also import other XQuery (library) modules:

```xquery
import module namespace nerf = "https://nerf.nerf/ns" at "./nerf.xql";
```

## Step 2: Run via command line

```sh
xml-generator my-module.xqm my-xml.xml
```

# Examples

Everything in `examples/` is exemplary. It's a good demonstration of how to generate a realistic set of data: DITA maps,
topics, and JATS articles.

# Generator XQuery library

The following functions become available from the `generator` module if you import it as shown above:

```xquery
declare function generator:create-document-for-node (
	$fileName as xs:string,
	$node as node()
) as xs:string;

declare function generator:create-document-name-for-child (
	$parentFileName as xs:string,
	$childBaseName as xs:string
) as xs:string;

declare function generator:log (
	$message as item()*
) as xs:boolean;

declare function generator:random-boolean (
	$probability as xs:double
) as xs:boolean;

declare function generator:random-number (
	$min as xs:double,
	$max as xs:double
) as xs:double;

declare function generator:random-phrase () as xs:string;

declare function generator:random-words (
	$length as xs:double
) as xs:string;

declare function generator:random-paragraph () as xs:string;

declare function generator:random-controlled-value (
	$options as item()*
) as item()*;

declare function generator:random-mixed-content (
	$sentence as xs:string,
	$contentModels as array(*)
) as item()*;

declare function generator:random-content (
	$contentModels as array(*)
) as item()*;

declare function generator:random-content (
	$contentModels as array(*),
	$callbackArg as item()*
) as item()*;
```

# License

Copyright (c) 2019 Wybe Minnebo

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.**
