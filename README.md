# XQuery CLI

This lib lets you run XPath/XQuery. Uses child processes to support traversing large numbers of XML documents.

For now, only queries are supported -- writing changes back to file system may be implemented in the future

## Install

```sh
npm i xquery-cli -g
```

You can now use the `xq` command.

## XQuery Expressions

XPath or XQuery expressions can be piped from another process, loaded from an `.xqm` file, or in the `--expression` (`-x`)
option.

The following input is all equal:

```sh
xq --expression "fn:current-date()" -O
xq -x "fn:current-date()" -O
xq --module ./examples/currentDate.xqm -O
```

Or you pipe it in:

```
echo "fn:current-date()" | xq -O
cat ./examples/currentDate.xqm | xq -O
curl -s https://pastebin.com/raw/53pFDEbk | xq -O
```

## XML files

Any argument that is an option counts as an XML file location for which the expression is evaluated.

```
xq ./examples/xml/foo.xml -x "()" ./examples/xml/bar.xml
xq ./examples/xml/*.xml -x "()"
```

For terminals that don't expand file patterns, or to circumvent a "Too many arguments in command line" error, use
`--glob` (`-g`):

```sh
xq --glob "./examples/xml/*.xml" -x "()"
xq -g "./examples/xml/*.xml" -x "()"
```

If you want to use both pattern expansion and the `--glob` flag you are a mad lad. It would be useful to know that you
may get duplicate results, and results may be ordered differently.

## Reporting

By default XQuery returns are logged to STDOUT, and event data is logged to STDERR. Use `--no-stdout` (`-o`) or
`--no-stderr` (`-O`) if you want.
only events are logged, to STDERR. If you use the `--stdout` (`-o`) option you will also see the output
returned by your console on STDOUT. Use `--no-stderr` (`-O`) if you are then no longer interested in the events.

```sh
xq -x "fontoxpath:version()" --no-stderr
```

## Acknowledgements

This tool relies on the excellent [fontoxpath](https://www.npmjs.com/package/fontoxpath),
[slimdom](https://www.npmjs.com/package/slimdom) and [saxes](https://www.npmjs.com/package/saxes).
