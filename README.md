# XQuery CLI

This lib lets you run XPath/XQuery on a large number of XML documents.

For now, only queries are supported -- writing changes back to file system may be implemented in the future

## Install

```sh
npm i wvbe/xquery-cli -g
```

## Usage

Given a directory `my-documents/`, you could use it like so:

```sh
xquery-cli "my-documents/**/*.xml" --expression "count(//table)"
```

Or, if your query is more complex than that, save it as a file and:

```sh
xquery-cli "my-documents/**/*.xml" my-query.xqm
```

Or pipe your query in:

```sh
cat my-query.xqm | xquery-cli "my-documents/**/*.xml"
```

## Reporting

By default, every result is printed to STDOUT on its own line. This is the `results` reporter (`--reporters results`).
Hopefully this makes it easier to use `xquery-cli` in other automation.

By default, XPath maps (translates to JS objects) are printed as a line of tab-separated values:

```sh
echo "map {
  'amountOfConrefs': count(//@conref),
  'amountOfTables': count(//table),
  'topicTitle': normalize-space(/*/title/string())
}" | xquery-cli "examples/xml/**/*.dita"
```

Yields:

```
1       0       Notifications
0       0       Analytical reporting with
0       1       Resource actions and destinations
12      1       Standard responses
0       0       About job submission from active running jobs
```

Another reporter, `--reporters events` will print the query progress to STDERR, so you can pipe the actual results
to a file while still enjoying a clear view of what's going on. You can use both reporters at the same time:

```sh
xquery-cli "my-documents/**/*.xml" --expression "count(//@conref)" --reporters results events > output.txt
```

## Acknowledgements

This tool relies heavily on the excellent [fontoxpath](https://www.npmjs.com/package/fontoxpath),
[slimdom](https://www.npmjs.com/package/slimdom) and [saxes](https://www.npmjs.com/package/saxes).