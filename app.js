var restify = require('restify');
var builder = require('botbuilder');

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

bot.dialog('survey', [
    function (session) {
        builder.Prompts.text(session, 'Hello! What\'s your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        builder.Prompts.choice(session, 'Hi ' + results.response + ', What are your fitness goals?',choices);
    },
    function (session, results) {
        session.userData.goals = results.response.entity;
        builder.Prompts.text(session, 'Please enter your height in feet:');
    },
    function (session, results) {
        session.userData.height = results.response;
        builder.Prompts.text(session, 'Please enter your weight in pounds: ');
    },
    function (session, results) {
        session.userData.weight = results.response;
        session.endDialog('Got it! ' + session.userData.name +
            ', your fitness goal is ' + session.userData.goals +
            ', your height is ' + session.userData.height + ' feet and your weight is ' + session.userData.weight) + ' pounds';
    }
]);