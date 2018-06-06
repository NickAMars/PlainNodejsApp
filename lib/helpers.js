/**
* Helpers for various tasks
*
*/
//Dependencies
const crypto = require('crypto'),
      querystring = require('querystring'),
      https  =  require('https'),
      config = require('./config');

//Constainer for all the Helpers
let helpers = {};

//Create sha256
helpers.hash = function(str){ // for password
  if(typeof(str) == 'string' && str.length > 0){
    //config.hashingSecret is the hashingSecret
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  }else {
    return false;
  }
};

// PARSE a JSON string to an object
helpers.parseJsonToObject = function(str){ // sending to file
  try{
    const obj = JSON.parse(str);
    return obj;
  }catch(error){
    return {};
  }

};
helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if(strLength){
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let str = '';
    for(i = 1 ; i <= strLength ; i++){
      str += possibleCharacters.charAt(Math.floor(Math.random()*possibleCharacters.length));
    }
    return str;
  }else{
    return false;
  }
}
// Sending an SMS message by Twilio
helpers.sendTwilioSms = function(phone, msg, callback){
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) ==  'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if(phone && msg){
    //Configure the request payload
    const payload = {
      'From' : config.twilio.fromPhone,
      'To'   : '+1' + phone,
      'Body' : msg
    };

    //Stringify the payload
    let stringPayload = querystring.stringify(payload);

    //Configure the request details
    let requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method'   : 'POST',
      'path'     : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth'     : config.twilio.accountSid + ':' + config.twilio.authToken,
      'headers'  : {
                    'Content-Type'  : 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(stringPayload)
                  }
      };
      // instanciate
      const req = https.request(requestDetails, function(res){
        //grab the status of the sent request
        var status = res.statusCode;

        // Callback successfully is the request went through
        if(status == 200 || status == 201){
          callback(false);
        }else{
          callback('Status code returned was ' + status);
        }
      });

      //Bind to the error event so it doesn't get thrown
      req.on('error', function(err){
        callback(err);
      });
      // add payload
      req.write(stringPayload);
      //End the request
      req.end();

  }else{
    callback('Given parameters were missing or invalide')
  }

};



module.exports = helpers;
