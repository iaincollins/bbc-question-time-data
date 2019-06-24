# BBC Question Time Data

This repository includes a data for the UK political / current affairs TV show **BBC Question Time**, and the scripts to generate the data (which you can inspect and run yourself).

The goal is provide hard data to use when evaluating the validity of accusations of bias in BBC Question Time guest selection and to do so in a transparent manner.

The analysis includes a record of each appearance by a guest, along with their Wikipedia entry to uniquely identify them and - where possible - it includes the political party affiliation for politicians.

The latest historical data, for 1979-2019:

* [Detailed list of appearances (CSV)](https://raw.githubusercontent.com/iaincollins/bbc-question-time-data/master/appearances.csv)
* [List of appearances by guest (txt file)](https://raw.githubusercontent.com/iaincollins/bbc-question-time-data/master/appearances-by-guest.txt)
* [List of appearances by party (txt file)](https://raw.githubusercontent.com/iaincollins/bbc-question-time-data/master/appearances-by-party.txt)

You [find a write up of this analysis on Medium](https://medium.com/@iaincollins/bias-in-bbc-question-time-66f77ecc11ec). The Data Journalism team at The Economist [have also written about it](https://www.economist.com/graphic-detail/2019/01/09/question-time-the-bbcs-flagship-political-show-gets-a-female-host).

An outcome from this project has been to improve the on underlying data stored in Wikipedia, to make the structured data it contains more accurate and useful for readers as well as for this sort of analysis.

## Licence

The data is extracted from Wikipedia and is licensed under Creative Commons Attribution Share-Alike license (CC-BY-SA). The data was entered by contributors to https://en.wikipedia.org/wiki/List_of_Question_Time_episodes and related pages. Feel free to use and/or modify this script or this data with appropriate credit.

## Contributing

Reports of actionable inaccuracies with the the data and pull requests to fix issues or enhance this script or the metadata are welcome.

The easiest way to correct a problem may be to update the Wikipedia page for for the list of Question Time Episodes or for the guest who is listed.

If the issue is specific to how this software interpretes that data or if you are unsure how to correct it you can raise an issue report at https://github.com/iaincollins/bbc-question-time-data/issues, email me@iaincollins.com or find me on twitter at [@iaincollins](https://twitter.com/iaincollins)

## Context

The context for this project is that the BBC have shared graphics and statistics relating to guests have refused requests for the underlying data to support them and panel bias is a perennial 'hot topic' among viewers who often express that they feel panels are biased one way or another.

* https://twitter.com/BBCNewsPR/status/1040246958420578304
* https://twitter.com/bbc5live/status/1045426533802942467
* https://www.whatdotheyknow.com/request/list_of_past_bbc_question_time_p
* https://www.whatdotheyknow.com/request/question_time_guest_appearances

## Known Limitations

* Getting accurate data is hard as people switch parties, parties split up, merge, people leave/are expelled from parties and ultimately the data is entered by humans who make mistakes. This is a 'best effort' approach that you are free to improve on and correct errors.
* Party data is not exhaustive. It does not include party data for everyone and there are instances where it may not be correct because there are quite a few edge cases.
* The data is crowd sourced and the code is open source. Contributions and corrections are welcome. If you report a specific and actionable inaccuracy it will be corrected.
* The party data displayed here is specifically for guests who are politicians, who (for the most part) are unambiguously associated with a specific political party.
* It does not currently reflect the political affiliation of guests who are not politicians as their alignment is not always known and harder to decern - though analysis of random sample data has not suggested deviation or bias in the political leanings of guests with known party allegiances.
* This data could be used as a starting point to categorize political affiliation for prominent guests, but would be at risk of being highly subjective without a clear methodology and/or independent source.

### Technical Limitations

* This script has no formal tests and has not been formally peer reviewed, although it remains the most comprehensive, transparent and open data analysis that exists.
* If the script encounters errors fetching data (e.g. rate limiting) it will gracefully fail without an error and will assume data is just not available, which may result in incomplete data in the resulting output. This is primarily mitigated by using `wikipedia-entites.json` to cache entity lookups from Wikipedia.
* The script is synchronous to mitigate rate limits on the Wikipedia API when not using the included cached data (which is updated whenever the script is run).

## How to run the script

This repository includes an example copy of appearances.csv you can use out of the box without having to do anything.

If you install `csvkit` (e.g. `brew install csvkit`) you can use `csvcut` to start to explore the data.

Get number of appearances by guest:

    csvcut -K 1 -c 4,6 appearances.csv | sort | uniq -c | sort -nr

Get number of appearances by party (or none):

    csvcut -K 1 -c 6 appearances.csv | sort | uniq -c | sort -nr
  
Get number of appearances by party by year (hacky but works):

    grep '2018-' appearances.csv | csvcut -c 6 | sort | uniq -c | sort -nr

If you want to build/update your own `appearances.csv` file, you will need Node.js. Install dependencies with `npm i` and run the script with:

    npm run update-data

The script will continuously output and exit when it is done. If it stalls without error you have probably hit rate limiting somewhere (e.g. on Wikipedia) or are just having a network problem. If it stalls, just try it again.

The script should only take a few seconds to complete.

Entity data is cached `wikipedia-entites.json` between runs, which speeds things up considerably.

## Credit

By <me@iaincollins.com> with thanks to the numerous contributors to free open source software and Wikipedia, without which publishing data like this would not be possible.
