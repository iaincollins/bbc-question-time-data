'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const moment = require('moment');
const tabletojson = require('tabletojson');
const json2csv = require('json2csv').parse;
const fetch = require('node-fetch');
const yargs = require(`yargs`);

const USE_LOCAL_CACHE = false

const listOfEpisodesUrl = 'https://en.wikipedia.org/wiki/List_of_Question_Time_episodes';
const listofEpisodesFile = './List of Question Time episodes - Wikipedia.html'
const listofEpisodesHtml = fs.readFileSync(path.resolve(__dirname, listofEpisodesFile), {encoding: 'UTF-8'});

async function guests() {
  // Cache responses from DBpedia in memory
  let wikipediaDataCache = {};
  
  let json = await getEpisodeListJson();
  
  let isFirstRow = true
  
  // We use 'for' instead of 'forEach' as we WANT to be blocking as it's the
  // easiest way to avoid hitting rate limits fetching data from DBpedia.
  // The downside is the script takes 30-60 seconds or so to run.
  for (const table of json) {
    for (const row of table) {
      // Only parse tables that have a '#' indicating they are about an episode
      if (row['#']) {
        let $
        
        // Note: `.replace(/\[.*\]/, '').trim()` is used below to clean up
        // wikimarkup with pointers to footnotes.
        
        // Fields sometimes contain HTML so we use Cheerio to parse them
        $ = cheerio.load(row.Location);
        const EpisodeLocation = $.text().replace(/\[.*\]/, '').trim();
        
        $ = cheerio.load(row.Airdate);
        const date = Date.parse($.text().replace(/\[.*\]/, '').trim());
        const EpisodeDate = moment(date).format('YYYY-MM-DD');
        
        $ = cheerio.load(row.Panellists);
        const panellists = $.text().split(',');
        
        for (const panellist of panellists) {

          let guest = panellist.replace(/\[.*\]/, '').trim();
          let url = null;
          let party = null;
          let partyUrl = null;
          
          // Some panelists also have links to their Wikipedia page.
          // Not all do though, so we do something a bit odd here to get the URL
          // in a way that doesn't fail if they don't have one. This would 
          // return an incorrect URL if two panellists on the same episode had 
          // the same name, but that hasn't happend YET.
          $('a').each(function(i, elem) {
            if (guest === $(this).text().replace(/\[.*\]/, '').trim())
              url = $(this).attr('href');
          });
          
          if (url) {
            // If we have a URL for the entity then we try treating it as a 
            // DBpedia object and see if we can look it up.
            let entityName = url.replace(/^\/wiki\//, '')
              
            const wikipediaDataForGuest = await new Promise(async (resolve, reject) => {
              const wikipediaJsonUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${entityName}&redirects=1&format=json`;

              if (!wikipediaDataCache[entityName]) {
                let res = null
                try {
                  // If not in cache, fetch it and add it to cache
                  res = await fetch(wikipediaJsonUrl);
                  const json = await res.json();

                  wikipediaDataCache[entityName] = json;

                  return resolve(wikipediaDataCache[entityName]);
                } catch (e) {
                  // console.error('Failed to get data for ${wikipediaJsonUrl}`)
                }
              } else {
                // If already in cache, used cached copy
                return resolve(wikipediaDataCache[entityName]);
              }
            });

            
            if (wikipediaDataForGuest && wikipediaDataForGuest.parse) {
              
              // Normalise entity name if we can
              if (wikipediaDataForGuest.parse.title) {
                guest = wikipediaDataForGuest.parse.title;
              }
            
              // Get party using regex. It is not structured data in Wikipedia
              // and is missing from structured data on other sites which often
              // have outdated data. This seems fragile but is actually reliable
              // in practice, although there are edge cases.
              const descriptionText = wikipediaDataForGuest.parse.text['*']
              const regex = RegExp(/<tr><th scope="row">Political party<\/th><td>\n<a href="\/wiki\/(.*?)"/);
              const regexResult = regex.exec(descriptionText);            
              if (regexResult) {
                party = regexResult[1];
              }
            }
          }
          
          const apperance = {
            Episode: Number(row['#']) || 0,
            Date: EpisodeDate,
            Location: EpisodeLocation,
            Guest: decodeURIComponent(guest),
            GuestUrl: (url) ? url.replace(/^\/wiki\//, 'https://en.wikipedia.org/wiki/') : '',
            Party: (party) ? decodeURIComponent(party.replace(/_/g, ' ')) : 'Unknown',
            PartyUrl: (party) ? `https://en.wikipedia.org/wiki/${party}` : ''
          };
          
          // Only output if we actually have at least a guest name.
          // (Some entries are like this, e.g. not yet aired or missing data).
          if (guest) {
            // Only print column headings on first row
            if (isFirstRow === true) {
              isFirstRow = false;
              console.log(json2csv(apperance));
            } else {
              console.log(json2csv(apperance, { header: false }));
            }          
          }
        }
      }
    }
  }
}

// It's handy to set 'USE_LOCAL_CACHE' to true during debugging / development.
async function getEpisodeListJson() {
  return new Promise(resolve => {
    if (USE_LOCAL_CACHE === true) {
      const json = tabletojson.convert(listofEpisodesHtml, { stripHtmlFromCells: false });
      return resolve(json);
    } else {
      tabletojson.convertUrl( listOfEpisodesUrl, { stripHtmlFromCells: false },
        (json) => {
          return resolve(json);
        }
      );
    }
  });
}

yargs
.demand(1)
.command(
  `appearances`,
  `A list of appearances by guests on BBC Question Time`,
  {},
  opts => guests()
)
.example(`node $0 appearances`, `A list of appearances by guests on BBC Question Time`)
.wrap(120)
.recommendCommands()
.epilogue(`This program is not associated with the BBC.`)
.help()
.strict().argv;