# BBC Question Time Data

Appearance data for the BBC Question Time TV show, and scripts to genreate the apperance data.

It includes a record of each appearance by a guest, along with their Wikipedia entry to uniquely identify them and - where possible - it includes the political party affiliation for politicians.

An outcome from this project has been to improve the on underlying data stored in Wikipedia to make the structured data it contains more useful.

[I've done a write up about it on Medium](https://medium.com/@iaincollins/bias-in-bbc-question-time-66f77ecc11ec) and it's mentioned and the data used [in this Economist article](https://www.economist.com/graphic-detail/2019/01/09/question-time-the-bbcs-flagship-political-show-gets-a-female-host).

## Licence

The data is extracted from Wikipedia and is licenced under Creative Commons Attribution Share-Alike license (CC-BY-SA). The data was entered by contributors to https://en.wikipedia.org/wiki/List_of_Question_Time_episodes and related pages. Feel free to use and/or modify this script or this data with appropriate credit.

## Contributing

Reports of actionable inaccuracies with the the data and pull requests to fix issues or enhance this script are welcome.

The easiest way to correct a problem may be to update the Wikipedia page for for the list of Question Time Episodes or for the guest who is listed.

If the issue is specific to how this software interperates that data or if you are unsure how to correct it you can raise an issue report at https://github.com/iaincollins/bbc-question-time-data/issues, email me@iaincollins.com or find me on twitter at [@iaincollins](https://twitter.com/iaincollins)

## Context 

The context for this project is that the BBC have shared graphics and statistics relating to guests have refused requests for the underlying data to support them and panel bias is a perennial 'hot topic' among viewers who often express that they feel panels are biased one way or another.

* https://twitter.com/BBCNewsPR/status/1040246958420578304
* https://twitter.com/bbc5live/status/1045426533802942467
* https://www.whatdotheyknow.com/request/list_of_past_bbc_question_time_p
* https://www.whatdotheyknow.com/request/question_time_guest_appearances

## Known Limitations

* Getting accurate data is hard as people switch parties, parties split up, merge, people leave/are expelled from parties and ultimately the data is entered by humans who make mistakes. This is a 'best effort' approach that you are free to improve on.
* Party data is not exhaustive. It does not include party data for everyone and there are instances where it may not be correct because there are quite a few edge cases.
* The data is crowd sourced and the code is open sourced. Contributions and corrections are welcome. If you report a specific and actionable inaccuracy it will be corrected.
* The party data displayed here is specifically for guests who are politicians, who (for the most part) are unambiguously associated with a specific political party.
* It does not currently reflect the political affiliation of guests who are not politicians as their alignment is not always known and harder to decern.
* This data could be used as a starting point to catagorise political affiliation for promiment guests, but would be at risk of being highly subjective without a clear methodology and/or independant source.

### Technical Limitations

* This script has no formal tests and has not been peer reviewed, although it remains the most comprehensive, transparent and open analysis that exists. 
* If the script encounters errors fetching data (e.g. rate limiting) it will gracefully fail without an error and will assume data is just not available, which may result in have incomplete data in the resulting output. 
* The script is synchronous to mitigate rate limits on the Wikipedia API when not using the included cached data (which is perodically updated).

## How to run the script

This repository includes an example copy of appearances.csv you can use out of the box without having to do anything.

If you install `csvkit` (e.g. `brew install csvkit`) you can use `csvcut` to start to explore the data.

Get number of appearances by guest:

  > csvcut -K 1 -c 4,6 appearances.csv | sort | uniq -c | sort -nr

Get number of appearances by party (or none):

  > csvcut -K 1 -c 6 appearances.csv | sort | uniq -c | sort -nr
  
Get number of appearances by party by year (hacky but works):

  > grep '2018-' appearances.csv | csvcut -c 6 | sort | uniq -c | sort -nr

If you want to build/update your own `appearances.csv` file, you will need Node.js. Install dependancies with `npm i` and run the script with:

  > npm run update-data
  
The script will continuously output and exit when it is done. If it stalls without error you have probably hit rate limiting somewhere (e.g. on Wikipedia) or are just having a network problem. If it stalls, just try it again.

The script usually takes a couple of minutes to run. It is faster towards the end of the run as the in-memory cache is built up.

## Credit

By <me@iaincollins.com> with thanks to the numerous contributors to free open source software and Wikipedia, without which publishing data like this would not be possible.
