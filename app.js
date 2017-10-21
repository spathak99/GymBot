var restify = require('restify');
var builder = require('botbuilder');


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
var ID;
var weight;
var height;
var inches;
var feet;
var gender;
var goal;
var age;
var light = 1.375;
var moderate = 1.55;
var active = 1.75;
var BMR;
var TDEE;
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

setInterval(function () {
    var newAddresses = userStore.splice(0);
    newAddresses.forEach(function (address) {

        console.log('Starting survey for address:', address);

        // new conversation address, copy without conversationId
        var newConversationAddress = Object.assign({}, address);
        delete newConversationAddress.conversation;

        // start survey dialog
        bot.beginDialog(newConversationAddress, 'survey', null, function (err) {
            if (err) {
                // error ocurred while starting new conversation. Channel not supported?
                bot.send(new builder.Message()
                    .text('This channel does not support this operation: ' + err.message)
                    .address(address));
            }
        });

    });
}, 5000);

var choices = ['Bulking', 'Lean Muscle', 'Losing Weight'];
var genders = ['Male', 'Female'];
bot.dialog('survey', [
    function(session) {
        builder.Prompts.text(session, 'Hi, would you like to sign in with facebook?');
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
        session.userData.name = results.response;
        name =  results.response;
        builder.Prompts.text(session, 'Please enter your age:');
    },

    function (session, results) {
        session.userData.age = results.response;
        age = results.response;
        builder.Prompts.choice(session, 'Hi, please enter your gender:',genders);
    },
    
    function (session, results) {
        session.userData.gender = results.response.entity;
        gender = results.response;
        builder.Prompts.choice(session, 'Hi ' + session.userData.name + ', What are your fitness goals?',choices);
    },
    function (session, results) {
        session.userData.goals = results.response.entity;
        goal =  results.response.entity;
        builder.Prompts.text(session, 'Please enter your height in feet and inches:');
    },
    function (session, results) {
        session.userData.height = results.response;
        height =  results.response;
        builder.Prompts.text(session, 'Please enter your weight in pounds: ');
    },
    function (session, results) {
        session.userData.weight = results.response;
        weight =  results.response;
        if(gender == genders[0]){
            bmr = 66 + (0.453592 * weight)*13.7 + (height * 2.54)*5 - (6.8 * age);
        }else{
            bmr = 665 + (0.453592 * weight)*9.6 + (height * 2.54)*1.8- (4.7 * age);
        }

        StoreUserData();

        session.endDialog('Got it! ' + session.userData.name +
            ', your Basal Metabolic rate is' + '___ ' + '. Therefore, your Total Daily Engery Expenditure is' 
            + '___ ' + 'calories');
    }


]);

function StoreUserData() {
    var obj = {
        weight: this.weight,
        height: this.height,
        feet: this.feet,
        inches: this.inches,
        gender: this.gender,
        goal: this.goal,
        age: this.age,
        BMR: this.BMR,
        TDEE: this.TDEE
    }
    writeToDatabase("nonFacebookUsers/" + name, obj);
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