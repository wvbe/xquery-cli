map {
	"amountOfConrefs": count(//@conref),
	"amountOfTables": count(//table),
	"documentUri": $document-uri,
	"topicTitle": normalize-space(/*/title/string())
}