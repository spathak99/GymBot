let rp = require('request-promise-native');
let cheerio = require('cheerio');

let ENDPOINT = "https://www.bodybuilding.com"

let API = {
  _musclesIds: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18],
  _muscles: ["CHEST","FOREARMS","LATS","MIDDLE_BACK","LOWER_BACK","NECK","QUADRICEPS","HAMSTRINGS","CALVES","TRICEPS","TRAPS","SHOULDERS","ABDOMINALS","GLUTES","BICEPS","ADDUCTORS","ABDUCTORS"],
  _exTypesIds: [2,6,4,7,1,3,5],
  _exTypes: ["CARDIO","OLYMPIC_WEIGHTLIFTING","PLYOMETRICS","POWERLIFTING","STRENGTH","STRETCHING","STRONGMAN"],
  _equipmentIds: [9,14,2,10,5,6,4,15,1,8,11,3,7],
  _equipment: ["BANDS","FOAM_ROLL","BARBELL","KETTLEBELLS","BODY_ONLY","MACHINE","CABLE","MEDICINE_BALL","DUMBBELL","NONE","EZ_CURL_BAR","OTHER","EXERCISE_BALL"],
  _decodeType: function(num, type) {
    let types = [];
    for (let i = 0; i < this._muscles.length; i++)
      if (num & (1 << i)) types.push(this['_' + type + 'Ids'][i]);
    return types;
  },

  getExercises: function(muscles, exTypes, equipment) {
    let exercises = [];
    return rp.get({
      url: ENDPOINT + "/exercises/finder",
      headers: {
        "User-Agent": 'GymBot'
      },
      qs: {
        muscleid:       this._decodeType(muscles   || 0, "muscles"  ).join(','),
        exercisetypeid: this._decodeType(exTypes   || 0, "exTypes"  ).join(','),
        equipmentid:    this._decodeType(equipment || 0, "equipment").join(',')
      }
    }).then(html => {
      let $ = cheerio.load(html);
      let rps = [];
      let url = $('.ExCategory-results .ExResult-row .ExResult-cell--nameEtc a').each(function(index, elem) {
        let href = $(elem).attr('href');
        //Weird Hack
        if (href.match(/\//g).length != 2) return;
        rps.push(rp({
          url: ENDPOINT + href,
          headers: {
            "User-Agent": 'GymBot'
          }
        }).then(html => {
          let $ = cheerio.load(html);
          let exercise = {
            name: $('h2.ExHeading').text().trim(),
            videoUrl: $('#js-ex-jwplayer-video').attr('data-src'),
            videoPreview: $('#js-ex-jwplayer-video').attr('data-poster'),
            description: $('div.grid-8:nth-child(2)').text().trim()
          };
          exercises.push(exercise);
        }));
      });

      return Promise.all(rps).then(_ => exercises);
    });
  }
}

//Make Psudeo Enum API.MUSCLES and API.EXTYPES
for (let type of ["muscles", "exTypes", "equipment"]) {
  let newTypeVariable = type.toUpperCase();
  API[newTypeVariable] = {};
  for (let i = 0; i < API["_" + type].length; i++)
    API[newTypeVariable][API["_" + type][i]] = 1 << i;
}

exports = module.exports = API;