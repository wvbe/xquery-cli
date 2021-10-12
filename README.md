# XQuery CLI

This lib lets you run XPath/XQuery or XQUF on XML files. Uses child processes to support traversing
large amounts of content.



### Install

```sh
npm i xquery-cli -g
```

You can now use the `xq` command.

Alternative to installing `xq`, you can run `npx xquery-cli`



### XPath and XQuery 3.1 Expressions

XPath or XQuery expressions can be piped from another process, loaded from an `.xqm` file, or in the
`--expression` (`-x`) option.

The following input is all equal:

```sh
xq --expression "fn:current-date()"
xq -x "fn:current-date()"
xq --module ./examples/simple-example.xqm
```

Or you pipe it in:

```sh
echo "fn:current-date()" | xq
cat ./examples/simple-example.xqm | xq
curl -s https://pastebin.com/raw/53pFDEbk | xq
```



### XML files

Any argument that is an option counts as an XML file location for which the expression is evaluated.

```sh
xq ./foo.xml -x "()"
xq ./foo.xml ./bar.xml -x "()"
xq ./foo.xml -x "()" ./bar.xml
xq ./*.xml -x "()"
```

For terminals that don't expand file patterns, or to circumvent a "Too many arguments in command
line" error, use `--glob` (`-g`):

```sh
xq --glob "./examples/**/*.xml" -x "()"
xq -g "./examples/**/*.xml" -x "()"
```

If you want to use both pattern expansion and the `--glob` flag you are a mad lad. It would be
useful to know that you may get duplicate results, and results may be ordered differently.



### Updating XML

[fontoxpath](https://www.npmjs.com/package/fontoxpath) supports XQuery Update Facility, therefore
`xq` does too. Simply make your expression updating to use it, and `xq` will update the affected
files in place -- It's recommended that you do this in version controlled content only. Optionally
combine with the `--dry` option to not _actually_ make file changes just yet.

```sh
xq ./foo.xml -x "replace node /* with <bar />"
```



### Variables

When running a query on files you are provisioned with the `$document-uri` variable. It is set to
the name of the file that that query is evaluated on at the time.

```sh
xq ./foo.xml -x "\$document-uri"
```

On Windows you might _not_ have to escape the `$`.



### Reporting

By default XQuery returns are logged to STDOUT, and event data is logged to STDERR. Use
`--no-stdout` (`-o`) or `--no-stderr` (`-O`) if you want.

```sh
xq -x "fontoxpath:version()" --no-stderr
```

You can also control the amount of messages, by picking to limit yourself to `rawOutput``verbose`,
`info`, or `error` and everything "above" it like so:

```sh
xq -x "fontoxpath:version()" --log-level verbose
```



## Acknowledgements

This tool relies on the excellent [fontoxpath](https://www.npmjs.com/package/fontoxpath),
[slimdom](https://www.npmjs.com/package/slimdom) and [saxes](https://www.npmjs.com/package/saxes).
