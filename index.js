'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const moment = require('moment');
const tabletojson = require('tabletojson');
const json2csv = require('json2csv').parse;
const fetch = require('node-fetch');
const yargs = require(`yargs`);

/*** Begin Configuration ***/

// Use local cache to get list of episodes (default: `false`).
// If `true` will use EPISODES_FILE to get cached episode and guest list.
// If `false` will use EPISODES_URL to get latest episode and guest list.
// Useful to set to `true` for offline development.
const USE_EPISODE_CACHE = false; 

// Use local entity cache (default: `true`).
// If `true` will use local cache of entity data, and fallback to Wikipedia
// only if entity data does not exist in the cache. New data will be saved to
// the local cache to make subsequent executions quicker.
// If `false` will not read or write to the local cache and will only cache in
// memory (which is flushed when the script finished excuting).
const USE_ENTITY_CACHE = true;

// Use local overrides for Wikpedia data (default: `true`).
//
// This file contains data we can use to override information stored in 
// Wikipedia because it is incomplete, inaccruate or because the script is not
// yet able to handle how to interperate the data stored in Wikiepdia.
//
// This includes cases such as people have been members of more than one 
// political party or who have resigned. There will always be exceptions and 
// this is intended for less ambiguous where the affiliation is not generally
// disputed.
//
// Examples:
//
// * Alex Salmond has resigned from the Scottish National Party in 2018 but 
//   appeared as a promiment member of the party. Although he is no longer a
//   member of the party he is counted as being a member of the SNP as he was
//   at the time when he appeared on the show.
//
// * Menzies Campbell was previously a member of the Liberal until 1998, when 
//   the Liberal Party merged with the SDP to become the Liberal Democrats
//   (when he has been a member of ever since). The script is not yet able to
//   handle Wikiepdia data for this case correctly so we use the overide the 
//   data ensure we use the most appropriate and up to date affiliation.
//
// Cases that require editorial judgement including the affilations of guests
// who are not politicans will not be tracked using this field. An additional
// political alignment metric would be more suitable and may abe added in 
// future. Edge cases (such as guests who have switched party between 
// appearances are not currently supported.
//
// This is a hack, but it's pragmatic.
const USE_ENTITY_PATCH = true;

const EPISODES_URL = 'https://en.wikipedia.org/wiki/List_of_Question_Time_episodes';
const EPISODES_FILE = `${__dirname}/List of Question Time episodes - Wikipedia.html`;
const ENTITY_CACHE_FILE = `${__dirname}/wikipedia-entities.json`;
const ENTITY_PATCH_FILE = `${__dirname}/wikipedia-patch.json`;

/*** End Configuration ***/
    
async function getAppearances() {
  // Cache responses from DBpedia in memory
  let wikipediaEntities = {};
  
  if (USE_ENTITY_CACHE === true && fs.existsSync(ENTITY_CACHE_FILE)) {
    wikipediaEntities = JSON.parse(fs.readFileSync(ENTITY_CACHE_FILE, 'utf8')) || {};
  }
  
  // Entity data can be overriden by values patch file
  const entityPatchFile = JSON.parse(fs.readFileSync(ENTITY_PATCH_FILE, 'utf8')) || {};
  
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

              if (!wikipediaEntities[entityName]) {
                let res = null
                try {
                  // If not in cache, fetch it and add it to cache
                  res = await fetch(wikipediaJsonUrl);
                  const json = await res.json();

                  wikipediaEntities[entityName] = json;

                  return resolve(wikipediaEntities[entityName]);
                } catch (e) {
                  // console.error('Failed to get data for ${wikipediaJsonUrl}`)
                }
              } else {
                // If already in cache, used cached copy
                return resolve(wikipediaEntities[entityName]);
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
            
            // Override data from Wikipedia if we have our own data.
            // Note: This flow still updates the Entity Cache if enabled, we
            // are just overriding the output.
            if (entityPatchFile[entityName]) {
              if (entityPatchFile[entityName].party) {
                party = entityPatchFile[entityName].party
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
  
  if (USE_ENTITY_CACHE === true) {
    fs.writeFileSync(ENTITY_CACHE_FILE, JSON.stringify(wikipediaEntities, null, 2));
  }
  
}

async function getEpisodeListJson() {
  return new Promise(resolve => {
    if (USE_EPISODE_CACHE === true) {
      const html = fs.readFileSync(path.resolve(__dirname, EPISODES_FILE), {encoding: 'UTF-8'});      
      const json = tabletojson.convert(html, { stripHtmlFromCells: false });
      return resolve(json);
    } else {
      tabletojson.convertUrl( EPISODES_URL, { stripHtmlFromCells: false },
        (json) => {
          return resolve(json);
        }
      );
    }
  });
}

function getEntity(entityName) {
  // @FIXME Syntax to get around yargs not supporting async functions
  (async function() {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${entityName}&redirects=1&format=json`);
    const json = await res.json();
    console.log(JSON.stringify({ [entityName]: json }, null, 2));
  }());
}

yargs
.demand(1)
.command(
  `appearances`,
  `Return a list of appearances by guests on BBC Question Time`,
  {},
  argv => getAppearances()
)
.command(
  `entity <entity>`,
  `Return an entity from Wikipedia (for debugging)`,
  {},
  argv => getEntity(argv.entity)
)
.example(`node $0 appearances`, `Return a list of appearances by guests on BBC Question Time`)
.example(`node $0 entity Menzies_Campbell`, `Return an entity from Wikipedia`)
.wrap(120)
.recommendCommands()
.epilogue(`This program is not associated with the BBC.`)
.help()
.strict().argv;