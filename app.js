var restify = require('restify');
var builder = require('botbuilder');
var bodybuilder = require('./libs/bodybuilder');

var firebase = require("firebase");

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
//restDay, height, sex, activityType, age, bmr, tdee, calGoal, goal, equipment,day0,day1,day2,day3,day4,day5,day6
var data = {};
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
     // store user's address
     var address = session.message.address;
     userStore.push(address);

     // end current dialog
    session.endDialog('Welcome to My Fitness Bot');
});

setInterval(function() {
    var newAddresses = userStore.splice(0);
    newAddresses.forEach(function (address) {

        console.log('Starting survey for address:', address);

        // new conversation address, copy without conversationId
        var newConversationAddress = Object.assign({}, address);
        delete newConversationAddress.conversation;

        // start survey dialog
        if(!data.setup){
            bot.beginDialog(newConversationAddress, 'survey', null, function (err) {
                if (err) {
                    // error ocurred while starting new conversation. Channel not supported?
                    bot.send(new builder.Message()
                        .text('This channel does not support this operation: ' + err.message)
                        .address(address));
                }
            });
        } else {
            //TODO: begin other dialog
        }
       

    });
}, 500);

var choices = ['Bulking', 'Lean', 'Weight Loss'];
var activities = ['Light', 'Moderate', 'Active'];
var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
var setupDone = false;
const days;
bot.dialog('survey', [
    function(session, results) {
        builder.Prompts.choice(session, 'Hi, would you like to sign in with facebook?', "yes|no", BUTTONS)
    },
    function (session, results) {
        if((results.response + "").toUpperCase() == ("yes").toUpperCase()) {
            //firebase.auth().signInWithRedirect(provider);
            var msg = new builder.Message(session);
            msg.attachments([
                new builder.SigninCard(session)
                    .button(
                        "Sign in with facebook",
                        "https://www.facebook.com/v2.10/dialog/oauth?client_id=1951046761818596&redirect_uri=https://www.facebook.com/connect/login_success.html"
                    )
            ]);
            session.send(msg);
        } else {
            session.send("Okay, we'll continue without using facebook.");
        }
        builder.Prompts.text(session, 'Hello! What\'s your name?');
    },
    function (session, results) {
        name = results.response;
        builder.Prompts.text(session, 'Hi ' + session.userData.name + ', please enter your age:');
    },


    function (session, results) {
        data.age = +results.response;
        builder.Prompts.choice(session, 'Please enter your sex:', 'Male|Female', BUTTONS);
    },

    function (session, results) {
        sex = results.response;
        builder.Prompts.choice(session, 'Enter your estimated activity type', activities, BUTTONS);
    },
    
    function (session, results) {
        data.activityType = results.response.entity;
        builder.Prompts.choice(session, 'What are your fitness goals?',choices, BUTTONS);
    },
    function (session, results) {
        data.goal = results.response.entity;
        builder.Prompts.text(session, 'Please enter your height in feet and inches (ex: 6\'2")');
    },
    function (session, results) {
        var tempHeight = results.response.split(/[^0-9]+/g);
        data.height = tempHeight[0]*12 + (+tempHeight[1] || 0);

        builder.Prompts.text(session, 'Please enter your weight in pounds: ');
    },

    function (session, results, next) {
        data.weight = +results.response;
        if (sex == "Male") {
            data.bmr = 66  + (0.453592 * data.weight) * 13.7 + (data.height * 2.54) * 5   - (6.8 * data.age);
        } else {
            data.bmr = 665 + (0.453592 * data.weight) * 9.6  + (data.height * 2.54) * 1.8 - (4.7 * data.age);
        }
        

        data.bmr = Math.floor(data.bmr);
        var multipliers = {
            'Light': 1.375,
            'Moderate': 1.55,
            'Active': 1.725
        };
        data.tdee = Math.floor(data.bmr * multipliers[data.activityType]);

        console.log(data);

        session.send('Got it! ' + data.name +
            ', your Basal Metabolic rate is ' + Number(data.bmr) + '. Therefore, your Total Daily Energy Expenditure is ' 
            + data.tdee + ' calories');
        
        if(data.goal == 'Bulking') {
            data.calGoal = data.tdee + 750;
            session.send('Because you are trying to bulk up, your calorie goal should be '
                + data.calGoal + ' calories consumed per day.' );
        }else if(data.goal == 'Lean'){
            data.calGoal = data.tdee - 150;
            session.send('Because you are trying to get lean, your calorie goal should be '
                + data.calGoal + ' calories consumed per day.' );
        }else if(data.goal == 'Weight Loss'){
            data.calGoal = data.tdee - 500;
            session.send('Because you are trying to lose weight, your calorie goal should be '
                + data.calGoal + ' calories consumed per day.' );
        }
        session.send('Now, I will create a workout routine tailored just for you!');
        
        builder.Prompts.choice(session, 'Which day would you like to be your rest day?', days, BUTTONS)
    },
    
    function (session, results, next) {
        data.restDay = results.response;
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
        setupDone = true;
        session.send(adaptiveCardMessage);
    }
]);

bot.use({
    botbuilder: function(session, next) {
        if (setupDone) {
            data.equipment = JSON.stringify(session.message.value.equipment.split(';'));
            days= [[bodybuilder.MUSCLES[0],bodybuilder.MUSCLES[1],bodybuilder.MUSCLES[9],bodybuilder.MUSCLES[14]],
                [bodybuilder.MUSCLES[2],bodybuilder.MUSCLES[3],bodybuilder.MUSCLES[4],bodybuilder.MUSCLES[12]],
                [bodybuilder.MUSCLES[5],bodybuilder.MUSCLES[10],bodybuilder.MUSCLES[11],bodybuilder.MUSCLES[15]]
                [bodybuilder.MUSCLES[6],bodybuilder.MUSCLES[7],bodybuilder.MUSCLES[8],bodybuilder.MUSCLES[16]]
               [bodybuilder.MUSCLES[0],bodybuilder.MUSCLES[1],bodybuilder.MUSCLES[9],bodybuilder.MUSCLES[14]]
               [bodybuilder.MUSCLES[2],bodybuilder.MUSCLES[3],bodybuilder.MUSCLES[4],bodybuilder.MUSCLES[12]]];

              
            //TODO: Calculate schedule with every day except for data.restDay using bodybuilder.MUSCLES
            //Write that to data.schedule
            data.setup = true;
            StoreUserData().then(function() {
                var adaptiveCardMessage = new builder.Message(session).addAttachment({
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
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
                //TODO: Show data.schedule in a nice fashion
                //TODO: Tell user the keyword to start any workout is "Start my workout"
            });
        } else next();
    }
});

bot.dialog('workout', [
    //TODO: use bodybuilder.getExercises to get a list of 15 exercised for the given day
    //Muscles is defined by data.schedule for this weekday
    //ExTypes is defined by data entered during setup. You wouldnt powerlift trying to get lean
    //Equipment is literally just data.equipment
    //The promise returned by this is a JSON object. Display it's contents in the Chat.
]);

function StoreUserData() {
    writeToDatabase("nonFacebookUsers/" + name, data);
    //TODO: Remember to just read and write the data variable. It has everything in it
}

var writeToDatabase = function(databasePath, objectToWrite) {
    database.ref(databasePath).set(objectToWrite);
}

var readFromDatabase = function(databasePath) {
    return database.ref(databasePath).once("value")
        .then(function(snapshot){
            
            return snapshot.val();

        });
}