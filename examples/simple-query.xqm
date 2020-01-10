map {
	"amountOfConrefs": count(//@conref),
	"amountOfTables": count(//table),
	"topicTitle": normalize-space(/*/title/string())
}