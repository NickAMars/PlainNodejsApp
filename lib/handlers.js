/**
*     Request Handlers
*
*/
//Dependencies
const _data = require('./data'),
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
      _data.read('users', phone, function(err, readData){
        if(!err && readData){
          _data.delete('users', phone , function(err){
            if(!err){
              callback(200);
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
  _data.read('tokens', id, function(err, tokenData){
    if(!err && tokenData){
      //Check that the token id for the given user and has not expired
      if(tokenData.phone == phone && tokenData.expires > Date.now()){
        callback(true);
      }else {
        callback(false);
      }
    }else {
      callback(false);
    }
  });
};



module.exports = handlers;
