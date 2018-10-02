# BBC Question Time Data

Data (and scripts to fetch data) for the BBC Question Time TV show.

Specifically, it returns records of each appearance by a guest, along with their Wikipedia page to uniquely identify them and - where possible - their political party affiliation (if any, if known and subject to limitations).

## Licence

The data is from Wikipedia and used under Creative Commons Attribution Share-Alike license (CC-BY-SA). The data was created by contributors to https://en.wikipedia.org/wiki/List_of_Question_Time_episodes and related pages.

Feel free to use and/or modify this script or it's output.

A credit would be nice if you find it useful.

Pull requests to fix issues or enhance this script are welcome.

## Context 

The context for doing this is that the BBC have shared graphics and statistics relating to guests have refused requests for the underlying data to support them and it's a perennial 'hot topic' amoung viewers who often express that they feel panels are biased one way or another.

* https://twitter.com/BBCNewsPR/status/1040246958420578304
* https://twitter.com/bbc5live/status/1045426533802942467
* https://www.whatdotheyknow.com/request/list_of_past_bbc_question_time_p
* https://www.whatdotheyknow.com/request/45986/response/116725/attach/html/3/RFI20101160%20final%20response.pdf.html

## Known Limitations

* Treat output with caution, this script has no formal tests and has not been peer reviewed.
* If the script encounters errors fetching data (e.g. rate limiting) it will gracefully fail without erroring and will assume data is just not avlaible, which may result in have incomplete data in the resulting output. 
* Version 1.1 includes new routines for normalizing names (to correct for mispellings or inconsistencies) and is much better at getting party data but it's still imperfect and a 'best effort' approach.
* Getting accurate data is hard as people switch parties, parties split up, merge, people leave/are expelled from parties and ultimately the data is entered by humans who make mistakes.
* Party data is not exhaustive. It does not include party data for everyone (e.g. Arthur Scargill, Alex Salmond). This is because Wikipedia does not have that data in an easily useable or normalized form or because the script doesn't know how to parse that data or because "it's complicated".
* To avoid hitting rate limits on fetching data from Wikipedia the script is deliberately synchronous and so can take a few minutes to run. It caches data but only in memory on each run. This may be improved on in future.

## Usage:

This repository includes an example copy of appearances.csv you can use out of the box wihtout having to do anything.

If you install `csvkit` (e.g. `brew install csvkit`) you can use `csvcut` to start to explore the data.

Get number of appearences by guest:

  > csvcut -K 1 -c 4,6 appearances.csv | sort | uniq -c | sort -nr

Get number of appearences by party (or none):

  > csvcut -K 1 -c 6 appearances.csv | sort | uniq -c | sort -nr
  
Get number of appearences by party by year (hacky but works):

  > grep '2018-' appearances.csv | csvcut -c 6 | sort | uniq -c | sort -nr

If you want to build/update your own `appearances.csv` file, you will need Node.js. Install dependancies with `npm i` and run the script with:

  > npm run update-data
  
The script will continously output and exit when it is done. If it stalls without error you have probably hit rate limiting somewhere (e.g. on Wikipedia) or are just having a network problem. If it stalls, just try it again.

The script usually takes a couple of minutes to run. It is faster towards the end of the run as the in-memory cache is built up.

## Credit

Yet another terrible idea by <me@iaincollins.com> enabled by Node.js and Wikipedia and people who write nice open source software.