var restify = require('restify');
var builder = require('botbuilder');
var bodybuilder = require('./libs/bodybuilder');

var firebase = require("firebase");
// Require inside your project 
/*var NutritionixClient = require('nutritionix');
var nutritionix = new NutritionixClient({
    appId: '5eac3d9d',
    appKey: 'fc867587d084bd23f34c6b7debceec61'
    // debug: true, // defaults to false 
});*/
src="https://www.gstatic.com/firebasejs/4.5.0/firebase.js"
var config = {
    apiKey: "AIzaSyCXqurV20q5-96THLY1Nf0ov3Si5jk63Ak",
    authDomain: "gymbot-ece78.firebaseapp.com",
    databaseURL: "https://gymbot-ece78.firebaseio.com",
    projectId: "gymbot-ece78",
    storageBucket: "gymbot-ece78.appspot.com",
    messagingSenderId: "510403215335"
  };
firebase.initializeApp(config);
var provider = new firebase.auth.FacebookAuthProvider();


var database = firebase.database();
var loginWithFacebook = false;
var BUTTONS = { listStyle: builder.ListStyle.button };
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

var userStore = [];
// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector, function (session) {
    //restDay, height, sex, activityType, age, bmr, tdee, calGoal, goal, equipment,day0,day1,day2,day3,day4,day5,day6
    session.userData = {};
    // store user's address
    var address = session.message.address;
    userStore.push(address);

    // end current dialog
    session.userData.setupDone = false;
    session.userData.workedOut = false;
    session.endDialog('Welcome to My Fitness Bot');
});


bot.set('storage', new builder.MemoryBotStorage());

setInterval(function() {
    var newAddresses = userStore.splice(0);
    newAddresses.forEach(function (address) {

        console.log('Starting survey for address:', address);

        // new conversation address, copy without conversationId
        var newConversationAddress = Object.assign({}, address);
        delete newConversationAddress.conversation;

        bot.beginDialog(newConversationAddress, 'survey', null, function (err) {
            if (err) {
                // error ocurred while starting new conversation. Channel not supported?
                bot.send(new builder.Message()
                    .text('This channel does not support this operation: ' + err.message)
                    .address(address));
            }
        });
    });
}, 500);

var choices = ['Bulking', 'Lean', 'Weight Loss'];
var activities = ['Light', 'Moderate', 'Active'];
var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const scheduleTemplate = [
    [bodybuilder.MUSCLES[0 ],bodybuilder.MUSCLES[1 ],bodybuilder.MUSCLES[9 ],bodybuilder.MUSCLES[14]],
    [bodybuilder.MUSCLES[2 ],bodybuilder.MUSCLES[3 ],bodybuilder.MUSCLES[4 ],bodybuilder.MUSCLES[12]],
    [bodybuilder.MUSCLES[5 ],bodybuilder.MUSCLES[10],bodybuilder.MUSCLES[11],bodybuilder.MUSCLES[15]],
    [bodybuilder.MUSCLES[6 ],bodybuilder.MUSCLES[7 ],bodybuilder.MUSCLES[8 ],bodybuilder.MUSCLES[16]],
    [bodybuilder.MUSCLES[0 ],bodybuilder.MUSCLES[1 ],bodybuilder.MUSCLES[9 ],bodybuilder.MUSCLES[14]],
    [bodybuilder.MUSCLES[2 ],bodybuilder.MUSCLES[3 ],bodybuilder.MUSCLES[4 ],bodybuilder.MUSCLES[12]]
];
const exTypeMap = {
    'Bulking': ["Powerlifting", "Strength", "Strongman"],
    'Lean': ["Stretching", "Strength"],
    'Weight Loss': ["Plyometrics", "Cardio"]
}
bot.dialog('survey', [
    function(session, results, next) {
        //if (session.userData.name) return next();
        builder.Prompts.text(session, 'Hello! What\'s your name?');
    },

    function (session, results) {
        session.userData.name = results.response;
        ReadUserData(session).then(function(newData) {
            console.log("!!!! TWO");
            if (newData) {
                for (var key of Object.keys(newData)) {
                    session.userData[key] = newData[key];
                }
            }
            console.log("!!!! THREE", !!session.userData.setup);
            if (session.userData.setup) {
                //session.endDialog();
                session.beginDialog("workout");
            } else {
                builder.Prompts.text(session, 'Hi, ' + session.userData.name + '! Please enter your age.');
            }
        });
    },

    function (session, results) {
        session.userData.age = +results.response;
        builder.Prompts.choice(session, 'Please enter your sex:', 'Male|Female', BUTTONS);
    },

    function (session, results) {
        session.userData.sex = results.response;
        builder.Prompts.choice(session, 'Enter your estimated activity type', activities, BUTTONS);
    },
    
    function (session, results) {
        session.userData.activityType = results.response.entity;
        builder.Prompts.choice(session, 'What are your fitness goals?',choices, BUTTONS);
    },
    function (session, results) {
        session.userData.goal = results.response.entity;
        builder.Prompts.text(session, 'Please enter your height in feet and inches (ex: 6\'2")');
    },
    function (session, results) {
        var tempHeight = results.response.split(/[^0-9]+/g);
        session.userData.height = tempHeight[0]*12 + (+tempHeight[1] || 0);

        builder.Prompts.text(session, 'Please enter your weight in pounds: ');
    },

    function (session, results, next) {
        session.userData.weight = +results.response;
        if (session.userData.sex == "Male") {
            session.userData.bmr = 66  + (0.453592 * session.userData.weight) * 13.7 + (session.userData.height * 2.54) * 5   - (6.8 * session.userData.age);
        } else {
            session.userData.bmr = 665 + (0.453592 * session.userData.weight) * 9.6  + (session.userData.height * 2.54) * 1.8 - (4.7 * session.userData.age);
        }
        

        session.userData.bmr = Math.floor(session.userData.bmr);
        var multipliers = {
            'Light': 1.375,
            'Moderate': 1.55,
            'Active': 1.725
        };
        session.userData.tdee = Math.floor(session.userData.bmr * multipliers[session.userData.activityType]);

        session.send('Got it! ' + session.userData.name +
            ', your Basal Metabolic rate is ' + Number(session.userData.bmr) + '. Therefore, your Total Daily Energy Expenditure is ' 
            + session.userData.tdee + ' calories');
        
        if(session.userData.goal == 'Bulking') {
            session.userData.calGoal = session.userData.tdee + 750;
            session.send('Because you are trying to bulk up, your calorie goal should be '
                + session.userData.calGoal + ' calories consumed per day.' );
        }else if(session.userData.goal == 'Lean'){
            session.userData.calGoal = session.userData.tdee - 150;
            session.send('Because you are trying to get lean, your calorie goal should be '
                + session.userData.calGoal + ' calories consumed per day.' );
        }else if(session.userData.goal == 'Weight Loss'){
            session.userData.calGoal = session.userData.tdee - 500;
            session.send('Because you are trying to lose weight, your calorie goal should be '
                + session.userData.calGoal + ' calories consumed per day.' );
        }
        session.send('Now, I will create a workout routine tailored just for you!');
        
        builder.Prompts.choice(session, 'Which day would you like to be your rest day?', days, BUTTONS)
    },
    
    function (session, results, next) {
        session.userData.restDay = results.response.entity;
        builder.Prompts.text(session, 'Which of the following equipment do you have access to (or prefer)?', bodybuilder._equipments);
        var adaptiveCardMessage = new builder.Message(session).addAttachment({
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
                type: "AdaptiveCard",
                text: "What day of the week would you like to be your rest day?",
                body: [{
                    "type": "Input.ChoiceSet",
                    "id": "equipment",
                    "style":"expanded",
                    "isMultiSelect": true,
                    "choices": bodybuilder.EQUIPMENT.map(e => {
                        return {title: e, value: e}
                    })
                }],"actions": [{
                    "type": "Action.Submit",
                    "title": "OK"
                }]
            }
        });
        session.userData.setupDone = true;
        session.send(adaptiveCardMessage);
    }
]).triggerAction({
    matches: /^start my workout$/i,
    onSelectAction: (session, args, next) => {
        if (session.userData.setup) {
            session.endDialog();
            session.beginDialog("workout", args);
        }
    }
}).triggerAction({
    matches: /^reset data$/i,
    onSelectAction: (session, args, next) => {
        for (var key of Object.keys(session.userData)) {
            delete session.userData[key];
        }
        StoreUserData(session);
        session.beginDialog("survey", args);
        console.log("RESET");
    }
});


bot.use({
    botbuilder: function(session, next) {
        if (session.userData.setupDone) {
            session.userData.setupDone = false;
            session.userData.equipment = (session.message.value || {equipment: ''}).equipment.split(';');
            var daysWithoutRestDay = days.slice(0);
            daysWithoutRestDay.splice(days.indexOf(session.userData.restDay), 1);
            session.userData.scheduleWithRestBlank = scheduleTemplate.slice(0);
            session.userData.scheduleWithRestBlank.splice(days.indexOf(session.userData.restDay), 0, null);
            console.log(session.userData.scheduleWithRestBlank);

            session.userData.setup = true;
            StoreUserData(session);
            var columns = [{
                type: "Column",
                items: []
            }];
            daysWithoutRestDay.forEach((dayName) => {
                columns[0].items.push({
                    type: "TextBlock",
                    text: dayName
                })
            });
            for (var i = 0; i < scheduleTemplate[0].length; i++) {
                var newColumn = {
                    type: "Column",
                    items: [],
                    spacing: i ? "default" : "large"
                };
                for (var day of scheduleTemplate)
                    newColumn.items.push({
                        type: "TextBlock",
                        text: day[i]
                    });
                columns.push(newColumn);
            }
            console.log(columns);
            var adaptiveCardMessage = new builder.Message(session).addAttachment({
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.0",
                    body: [{
                        "type": "ColumnSet",
                        "columns": columns,
                    }]
                }
            });
            session.send("Here's your personalized weekly gym schedule:");
            session.send(adaptiveCardMessage);
            session.send("To start the day's workout, type \"start my workout\"");
            session.beginDialog('survey');
        } else next();
    }
});

function genMuscle(num) {
    return function(session, result) {
        var muscle = session.userData.todaySchedule[num - 1];
        var exType = exTypeMap[session.userData.goal];
        bodybuilder.getExercises([muscle], exType, session.userData.equipment).then(function(json) {
            var i = Math.floor(Math.random() * json.length);
            var exercise = json[i];
            if      (num == 1) suffix = 'st';
            else if (num == 2) suffix = 'nd';
            else if (num == 3) suffix = 'rd';
            else               suffix = 'th';


            session.send("Your " + num + suffix + " exercise is: " + exercise.name);
            session.send("Here's how to do it:\n" + exercise.description);
            console.log(exercise.videoUrl);
            console.log(exercise);
            var card = new builder.VideoCard(session)
            .title(exercise.name)
            .subtitle('Visual Explanation')
            .text()
            .image(builder.CardImage.create(session, exercise.videoPreview))
            .media([
                { url: exercise.videoUrl }
            ]);

            session.send(new builder.Message(session).addAttachment(card));
            builder.Prompts.choice(session, ' ', [num == 4 ? 'Finish' : 'Next'], BUTTONS);
        });
    };
}


bot.dialog('workout', [
    function(session, args, next) {
        var weekday = new Date().getDay();
        var todaySchedule = session.userData.scheduleWithRestBlank[weekday];
        if (todaySchedule == null) {
            session.send("Today is a rest day! Enjoy your day off of the gym!");
            //TODO: Something
        }
        session.send("Todays workout is for the following muscles: " + todaySchedule.join(', '));
        next()
    },
    genMuscle(1),
    genMuscle(2),
    genMuscle(3),
    genMuscle(4)
]);


  

function StoreUserData(session) {
    writeToDatabase("nonFacebookUsers/" + encodeURIComponent(session.userData.name), session.userData);
}

var writeToDatabase = function(databasePath, objectToWrite) {
    database.ref(databasePath).set(objectToWrite);
}

function ReadUserData(session) {
    return database.ref("nonFacebookUsers/" + encodeURIComponent(session.userData.name)).once("value")
        .then(function(snapshot){
            return snapshot.val();
        })
        .catch(function() {
            console.log("!!!!!");
        })
}