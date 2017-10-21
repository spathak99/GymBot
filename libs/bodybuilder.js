let rp = require('request-promise-native');
let cheerio = require('cheerio');

let ENDPOINT = "https://www.bodybuilding.com"

let API = {
  _musclesIds: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18],
  MUSCLES: ["Chest","Forearms","Lats","Middle Back","Lower Back","Neck","Quadriceps","Hamstrings","Calves","Triceps","Traps","Shoulders","Abdominals","Glutes","Biceps","Adductors","Abductors"],
  _exTypesIds: [2,6,4,7,1,3,5],
  EXTYPES: ["Cardio","Olympic Weightlifting","Plyometrics","Powerlifting","Strength","Stretching","Strongman"],
  _equipmentIds: [9,14,2,10,5,6,4,15,1,8,11,3,7],
  EQUIPMENT: ["Bands","Foam Roll","Barbell","Kettlebells","Body Only","Machine","Cable","Medicine Ball","Dumbbell","None","Ez Curl Bar","Other","Exercise Ball"],
  _genTransfer: function(type) {
    return function(name) {
      return API['_' + type + 'Ids'][API[type.toUpperCase()].indexOf(name)];
    };
  },

  getExercises: function(muscles, exTypes, equipment) {
    let exercises = [];
    return rp.get({
      url: ENDPOINT + "/exercises/finder",
      headers: {
        "User-Agent": 'GymBot'
      },
      qs: {
        muscleid:       muscles  .map(this._genTransfer('muscles')  ).join(','),
        exercisetypeid: exTypes  .map(this._genTransfer('exTypes')  ).join(','),
        equipmentid:    equipment.map(this._genTransfer('equipment')).join(',')
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

exports = module.exports = API;