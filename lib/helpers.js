/**
* Helpers for various tasks
*
*/
//Dependencies
const crypto = require('crypto'),
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




module.exports = helpers;
