var restify = require('restify');
var builder = require('botbuilder');
var weight;
var height;
var inches;
var feet;
var gender;
var ActivityType;
var goal;
var age;
var light = 1.375;
var moderate = 1.55;
var active = 1.75;
var BMR;
var tdee;
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
var activities = ['Light', 'Moderate', 'Active'];

var genders = ['Male', 'Female'];
bot.dialog('survey', [
    function (session) {
        builder.Prompts.text(session, 'Hello! What\'s your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        name =  results.response.entity;
        builder.Prompts.text(session, 'Hi ' + session.userData.name + ', please enter your age:');
    },

    function (session, results) {
        session.userData.age = results.response;
        age = Number(results.response);
        builder.Prompts.choice(session, 'Please enter your gender:',genders);
    },

    function (session, results) {
        session.userData.gender = results.response;
        gender = results.response;
        builder.Prompts.choice(session, 'Enter your estimated activy type',activities);
    },
    
    function (session, results) {
        session.userData.ActivityType = results.response.entity;
        ActivityType = results.response;
        builder.Prompts.choice(session, 'What are your fitness goals?',choices);
    },
    function (session, results) {
        session.userData.goals = results.response.entity;
        goal =  results.response.entity;
        builder.Prompts.text(session, 'Please enter your height in feet and inches as such(5\'7"):');
    },
    function (session, results) {
        session.userData.height = results.response;
        height =  results.response;        
        inches = 12*Number(height.charAt(0));
        var tempinches=Number(height.charAt(2));
        if(height.charAt(3)!='\''){
        tempinches = 10+Number(height.charAt(3).valueOf());
    }
        inches =  Number(inches+tempinches);

        console.log(inches);
        builder.Prompts.text(session, 'Please enter your weight in pounds: ');
    },

    function (session, results) {
        session.userData.weight = results.response; 
        weight =  Number(results.response);
        console.log(weight);
        if(gender == genders[0]){
            bmr = 66 + (0.453592 * weight)*13.7 + (inches * 2.54)*5 - (6.8 * age);
        }else{
            bmr = 665 + (0.453592 * weight)*9.6 + (inches * 2.54)*1.8- (4.7 * age);
        }
        bmr=Math.floor(bmr);
        if(ActivityType==activities[0])
        tdee = bmr*1.375;
        else if (ActivityType==activities[1])
        tdee= bmr*1.55;
        else
        tdee= bmr *1.725;
        tdee=Math.floor(tdee);
        
        session.endDialog('Got it! ' + session.userData.name +
            ', your Basal Metabolic rate is ' + Number(bmr) + '. Therefore, your Total Daily Engery Expenditure is ' 
            + tdee + ' calories');
    }


]);