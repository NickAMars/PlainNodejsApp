/**
*     Request Handlers
*
*/
//Dependencies
const _data = require('./data'),
      config = require('./config'),
      https  =  require('https'),
      querystring = require('querystring'),
      helpers = require('./helpers');

let handlers ={};

//Ping handler
handlers.ping = function(data , callback){
callback(200);
};
// handlers is NOT FOUND
handlers.notFound = function(data , callback){
callback(404);
};

//users
handlers.users = function (data, callback){
     const acceptableMethods = ['post', 'get', 'put', 'delete'];
     if(acceptableMethods.indexOf(data.method) > -1){
       // pass in method data and callback
       handlers._users[data.method](data,callback); // each method has data and callback
     }else {
       callback(405);// method not allowed
     }
};

//Container for the users submethods
handlers._users ={};
//  Users  -> post
//  Require data: firstName lastName, phone, password, tosAgreement
//  Optional data: none
handlers._users.post = function(data, callback){ // getting information from the user
  //Validate
  const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

console.log(data.headers.token);
//if false through 400, missing field
  if(firstName && lastName && phone && password && tosAgreement){
    //Make sure that the user doesnt already exist
    _data.read('users', phone, function (err, data){ //callback(err, parsedData);

      // if file doesnt exist which returns an err
      // then we create a new directory
              if(err){ //
                //Hash the password
                const hashPassword = helpers.hash(password);
                      if(hashPassword){ // if we successfull hash
                        const userObject = {
                          'firstName'    : firstName,
                          'lastName'     : lastName,
                          'phone'        : phone,
                          'password'     : hashPassword,
                          'tosAgreement' : true
                        };
                        //phone- filename , context - userObject,
                        _data.create('users',phone,userObject, function (err){
                              if(!err){
                                callback(200);
                              }else {
                                console.log(err);
                                callback(500,{'Error': 'Could not create the new user'});
                              }
                        });
                      }else{
                      callback(500, {'Error': 'Could not hash the user\'s password'});// the system err
                      }


              }else{
                callback(400, {'Error' : 'A User with that phone number already exists'});
              }
    });

  }else{
    callback(400, {'Error' : 'Missing require fields'}); // when user messes up
  }
};
//Users  -> get
// Required data: phone
// Optional data: none

handlers._users.get = function(data, callback){
// data.queryStringObject gets all the parameters
// check if phone number is Validate
    let phone =typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10? data.queryStringObject.phone.trim() : false;
    if(phone){
          // lookup the users
        //Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // verify that the given token is valid for the phonenumber
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
          if(tokenIsValid){
            _data.read('users', phone, function(err, readData){
                if(!err && readData){
                  // remove password from the user object before returning it to requester
                  delete readData.password;
                  callback(200, readData);
                }else {
                  callback(404);
                }
              });
          }else{
            callback(403, {'Error':'Missing required token in header, or token is invalid'});
          }
        });
    }else{
      callback(400, {'Error': 'Missing required field'});
    }

};
//Users  -> put
//Require data : phone
// Optional data : firstName ,lastName, password
// only athenicated user can update there object
handlers._users.put = function(data, callback){
  let phone =typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10? data.payload.phone.trim() : false;
  const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;


    if(phone){ // if we have a valid phone
      if(firstName || lastName || password){ // nothing has updated
        //Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // verify that the given token is valid for the phonenumber
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
          if(tokenIsValid){
                _data.read('users', phone , function( err, userData){
                    if(!err && userData){
                        if(firstName){  userData.firstName = firstName;}
                        if(lastName){userData.lastName = lastName;}
                        if(password){userData.password = helpers.hash(password);}
                        _data.update('users', phone, userData, function(err){
                          if(!err){
                            callback(200);
                          }else{
                            console.log(err);
                            callback(500, {'Error': 'Could not update the user'});
                          }
                        });
                    }else{
                        callback(400, {'Error' : 'The specified user does not exist'});
                    }
                });
          }else{
              callback(403, {'Error':'Missing required token in header, or token is invalid'});
          }
        });
      }else {
        callback(400, {'Error': 'Missing fields to update'});
      }
    }else{
      callback(400, {'Error': 'Missing required field'});
    }
};

//Users  -> delete
// Required field : phone
// only authenicated users
// Cleanup any other data
handlers._users.delete = function(data, callback){
// check if the phone number is valid
let phone =typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10? data.queryStringObject.phone.trim() : false;
if(phone){
  //Get the token from the headers
  const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  // verify that the given token is valid for the phonenumber
  handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
    if(tokenIsValid){
      // find out if user exist
      _data.read('users', phone, function(err, userData){
        if(!err && userData){
          _data.delete('users', phone , function(err){ // delete user
            if(!err){
              // delete all the check associated with the user
              let  userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array? userData.checks : []; // gets all the ids
              let checksToDelete = userChecks.length;

              if(checksToDelete > 0){
                let checksDeleted = 0 ; // keep track for the end
                let deletionErrors = false;
              userChecks.forEach(function (elem){
                    _data.delete('checks', elem, function(err){

                        if(err){
                          deletionErrors = true;
                        }
                        checksDeleted++;
                        // when checksDeleted iteration reaches checksToDelete we assign a call back base on err through all iteration
                        if(checksDeleted == checksToDelete){
                            if(!deletionErrors){// if no err
                              callback(200); // successCode
                            }else{
                              callback(500, {'Error': 'Errors encountered while attempting to delete checks'});
                            }

                        }

                    });
              });
              }else {
                callback(200);
              }
            }else {
              callback(500, {'Error' : 'Could not delete the specified user' });
            }
          });
        }else {
          callback(400, {'Error': 'Couldnt find the specified Users'});
        }
      });
    }else {
      callback(403, {'Error':'Missing required token in header, or token is invalid'});
    }
});
}else{
  callback(400, {'Error': 'Missing required field'});
}
};

//Tokens
handlers.tokens = function (data, callback){
     const acceptableMethods = ['post', 'get', 'put', 'delete'];
     if(acceptableMethods.indexOf(data.method) > -1){
       // pass in method data and callback
       handlers._tokens[data.method](data,callback); // each method has data and callback
     }else {
       callback(405);// method not allowed
     }
};
handlers._tokens = {};


// Tokens -> post
//Required data: phone , password
handlers._tokens.post = function(data, callback){
  const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if(phone && password){
    _data.read('users', phone, function(err, userData){
      if(!err && userData){
        const hashPassword = helpers.hash(password);
        if(hashPassword == userData.password){
          //create a new token , set experation _data
          const tokenId  =  helpers.createRandomString(20);
          const expires  =  Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            'phone'  : phone,
            'id'     : tokenId,
            'expires': expires
          }
          _data.create('tokens', tokenId, tokenObject, function(err){
            if(!err){
              callback(200);
            }else{
              callback(500,{'Error' : 'Could not create the new token'});
            }
          });

        }else {
          callback(400,{'Error': 'Password did not match the specified user\'s stored password'} );
        }
      }else {
        callback(400, {'Error': 'Could not find the specified user'});
      }
    });
  }else {
    callback(400, {'Error': 'Missing required fields'});
  }
};
//Tokens ->  get
//Require data : id
//Optional data : none
handlers._tokens.get = function(data, callback){
  let id =typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20? data.queryStringObject.id.trim() : false;
  if(id){
    // lookup the token
    _data.read('tokens', id, function(err, tokenData){
      if(!err && tokenData){
        callback(200, tokenData);
      }else {
        callback(404);
      }
    });
  }else{
    callback(400, {'Error': 'Missing required field'});
  }
};
//Tokens ->  put
//Required data : id ,extend
// Optional data: none
handlers._tokens.put = function(data, callback){
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if(id && extend){
    _data.read('tokens', id, function(err, tokenData){
      if(!err && tokenData){
        if(tokenData.expires > Date.now()){
          // set expiration +1h
          tokenData.expires =  Date.now() + 1000 * 60 * 60 ;
          _data.update('tokens', id, tokenData, function(err){
            if(!err){
              callback(200);
            }else {
              callback(500, {'Error': 'Could not update the token\'s expiration'});
            }
          });
        }else {
          callback(400, {'Error': 'The token has already expired, and cannot be extended'});
        }
      }else {
        callback(400, {'Error': 'Specified token does not exist'});
      }
    });
  }else {
    callback(400, {'Error' : 'Missing required field(s) or field(s) are invalid'});
  }
};
//Tokens ->  delete
//Required data: id
//Optional dat: none
handlers._tokens.delete = function(data, callback){
  let id =typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20? data.queryStringObject.id.trim() : false;
  if(id){
    // lookup the token
    _data.read('tokens', id, function(err, tokenData){
      if(!err && tokenData){
        _data.delete('tokens', id , function(err){
          if(!err){
            callback(200);
          }else {
            callback(500, {'Error' : 'Could not delete the specified token' });
          }
        });
      }else {
        callback(404, {'Error': 'Token no longer exist'});
      }
    });
  }else{
    callback(400, {'Error': 'Missing required field'});
  }
};

//Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function( id, phone , callback){
  _data.read('tokens', id, function(err, tokenData){ // gets token id from header
    if(!err && tokenData){
      //Check that the token id for the given user and has not expired
      if(tokenData.phone == phone && tokenData.expires > Date.now()){ // compare phone number of token to operation phone number
        callback(true); // sends back true if everything marches up
      }else {
        callback(false);
      }
    }else {
      callback(false);
    }
  });
};


//Checks
handlers.checks = function (data, callback){
     const acceptableMethods = ['post', 'get', 'put', 'delete'];
     if(acceptableMethods.indexOf(data.method) > -1){
       // pass in method data and callback
       handlers._checks[data.method](data,callback); // each method has data and callback
     }else {
       callback(405);// method not allowed
     }
};
// Container for all the checks methods
handlers._checks = {};


//Checks - > post
// Require data: protocol , url , method, successCodes. timeoutSecond
// Optional data: none
//Description: stores an array of check on the users object so the user can be use as a references
handlers._checks.post = function(data, callback){
    const protocol  = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1? data.payload.protocol : false;
    const url       = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method  = typeof(data.payload.method) == 'string' && ['get', 'put', 'post', 'delete'].indexOf(data.payload.method) > -1? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSecond = typeof(data.payload.timeoutSecond) == 'number' && data.payload.timeoutSecond % 1 === 0 && data.payload.timeoutSecond >= 1 && data.payload.timeoutSecond <= 5 ? data.payload.timeoutSecond : false;


    if(protocol &&  url  && method && successCodes && timeoutSecond ){
      // dont want annonimus user to create checks
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
      // look up the users
      _data.read('tokens', token, function(err, tokenData){
        if(!err && tokenData){
          const userPhone = tokenData.phone;
          // getting the users data
          _data.read('users', userPhone , function(err, userData){
            if(!err && userData){
              // gets the checks in the user object
              let userChecks=  typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [] ; // embedding data into the user file
              //check how many userChecks the user has
              if(userChecks.length < config.maxChecks){
                // Create a random id for the check
                const checkId = helpers.createRandomString(20); // create unique id

                // Create the check object, and include the user's phone
                const checkObject = {
                  'id'            : checkId,
                  'userPhone'     : userPhone,
                  'protocol'      : protocol,
                  'url'           : url,
                  'method'        : method,
                  'successCodes'  : successCodes,
                  'timeoutSecond' : timeoutSecond
                };

                //Save new  object    // the checkID is the different between all files
                _data.create('checks', checkId, checkObject, function(err){ // each time check is created with a different id
                    if(!err){
                      // Add the check id to user object
                      userData.checks = userChecks;
                      userData.checks.push(checkId); // add check to user file

                      _data.update('users', userPhone, userData, function(err){
                        if(!err){
                          callback(200, checkObject);
                        }else {
                          callback(500 , {'Error' : 'Could not update the user with the new check'});
                        }
                      });
                    }else { // if file already exist
                      callback(500, {'Error' : 'Could not create a new check'}); // system requirements
                    }
                });

              }else {// exceed maximum check limit
                callback(400 , {'Error': 'The user already has the maximum number of checks ('+config.maxChecks+')'});
              }
            }else {
              callback(403 , {'Error':  'Not Athorized'});
            }
          });
        }else {
          callback(403, {'Error' : 'Not Authorized'}); // not athorices
        }
      });

    }else {
      callback(400, {'Error': 'Missing required input, or input are invalid'}); // user input invalid
    }
};

//Checks - > get
//Required data : id
//Optional data : none

handlers._checks.get = function(data, callback){
  // check if id is valid
  let id =typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20? data.queryStringObject.id.trim() : false;
      if(id){
          // does check id exist
           _data.read('checks', id , function(err, checkData){
            if(!err && checkData){
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // verify that the given token is valid
                handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                  if(tokenIsValid){
                    callback(200, checkData);
                  }else{
                    callback(403);
                  }
                });
              }else{
                callback(404, {'Error': 'You do not have access to this file'});
              }
            });
      }else {
            callback(400, {'Error' : 'Missiong required field'});
      }
};

//Checks -> put
//Require data : id
//Optional data : protocol, url, method, successCode, timeoutSecond
handlers._checks.put = function(data, callback){
  const id =typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20? data.payload.id.trim() : false;
// check for fields
  const protocol  = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1? data.payload.protocol : false;
  const url       = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method  = typeof(data.payload.method) == 'string' && ['get', 'put', 'post', 'delete'].indexOf(data.payload.method) > -1? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSecond = typeof(data.payload.timeoutSecond) == 'number' && data.payload.timeoutSecond % 1 === 0 && data.payload.timeoutSecond >= 1 && data.payload.timeoutSecond <= 5 ? data.payload.timeoutSecond : false;

  if(id){
    if(protocol || url || method || successCodes || timeoutSecond){
      // looking the checks
      _data.read('checks', id, function(err, checkData){ // check for check
        if(!err && checkData){
          const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
          // verify that the given token is valid
          handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
            if(tokenIsValid){ // if token is active and phone in token matches in check
                    if(protocol){ checkData.protocol = protocol; }
                    if(url){checkData.url = url;}
                    if(method){checkData.method = method;}
                    if(successCodes){checkData.successCodes = successCodes;}
                    if(timeoutSecond){checkData.timeoutSecond = timeoutSecond;}
                    _data.update('checks', id , checkData,function(){
                      if(!err){
                        callback(200);
                      }else{
                        callback(500, {'Error ': 'Could not update the check'});
                      }
                    });
            }else{
              callback(403);
            }
          });
        }else{
          callback(400, {'Error' : 'Check ID did not exist'});
        }
      });

    }else{
      callback(400, {'Error': 'Missing fields to update'});
    }

  }else{
    callback(400, {'Error' : 'Missing required field'});
  }

};

//Check - > delete
//Required: id
//Optional: none
handlers._checks.delete = function(data, callback){
  let id =typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20? data.queryStringObject.id.trim() : false;
  if(id){ // have required fields
    _data.read('checks', id, function(err, checkData){ // see if there is a check id that matches check
      if(!err && checkData){ // if exist
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false; // get token thats in header
        // verify that the given token is valid for the phonenumber
        handlers._tokens.verifyToken(token, checkData.userPhone , function(tokenIsValid){
          if(tokenIsValid){ // true to authenicated user

            _data.delete('checks', id, function(err){ // delete check id here
               // TODO: Remove embedded check id in user
              if(!err){ // successfully deleted
                // find out if user exist
                _data.read('users', checkData.userPhone, function(err, userData){
                  if(!err && userData){ // user exist with the phone number
                    let userChecks=  typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [] ; // the user stack of checks
                    let checkPosition =  userChecks.indexOf(id); // find out the index the check is at
                    if(checkPosition > -1){ // if it exist
                      userChecks.splice(checkPosition , 1); // remove check from user
                      userData.checks = userChecks; // updating check in object
                      _data.update('users', checkData.userPhone ,userData, function(err){ // update file with check information
                        if(!err){
                          callback(200); // send a successCode
                        }else {
                          callback(500, {'Error' : 'Could not delete the specified user' }); // system err
                        }
                      });
                    }else {
                      callback(500 ,{"Error": "Could not find the check on the user\'s object"})
                    }

                  }else {
                    callback(500, {'Error': 'Couldnt find the Users who created the check'});
                  }
                });
              }else {
                callback(500, {'Error': 'Could not delete the check data'});
              }
            });


          }else {
            callback(403, {'Error':'Missing required token in header, or token is invalid'});
          }
      });

      }else{
        callback(400, {'Error': 'The check id does not exist'});
      }
    });

  }else{
    callback(400, {'Error': 'Missing required field'});
  }
};


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

module.exports = handlers;
