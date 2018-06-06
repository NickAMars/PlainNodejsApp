Creating a Restful Api

Concise of creating a new user with the provided fields
{
  'firstName'    : firstName,
  'lastName'     : lastName,
  'phone'        : phone,
  'password'     : hashPassword,
  'tosAgreement' : true
}
The passWord is encripted information by a sha256 code which the string of config.hashPassword.

Creating token verify if the user is log into his account
to create a token you would use the post method with the following information of an
existing user record
{
  phone : phone,
  password: password
}
The get method gets the information from the user
the put method updates the user information.
the delete method remove the user from file with all of there checks information.


the password would be encrypted and compare to the password of the user with the phone information.
then a token will be created with the following information:
tokenObject = {
 'phone'  : phone,
 'id'     : tokenId,
 'expires': expires
}
the expires token is use to see if the token is still running in this program we gave it a 1 hour period
until the following token expire.
The id is use as a header in which the user is suppose to know which would verify whether he/she
is authenticated or not.
The only method which are available when you do not have a token is the user post and the token post method.
you can only post a token if you sign in as a user.
The get method gets method of the token gets token information.
the put method increase the expiration time of the token by 1 hour.
the delete method removes the token from the file.

When you have a User login( with the token)
You are able to create a checks with the post method which contain the following information:
const checkObject = {
  'id'            : checkId,
  'userPhone'     : userPhone,
  'protocol'      : protocol,
  'url'           : url,
  'method'        : method,
  'successCodes'  : successCodes,
  'timeoutSecond' : timeoutSecond
}
Each check that is created is embedded in the user data with the phone number associated with it.
the maximum number of check that can be embedded is 5.
The get method return one check
the put method update the following properties of the check
{
  protocol: protocol,
  url: url,
  method =method,
  successCodes: successCodes,
  timeoutSecond: timeoutSecond
}
the delete method remove one check from the user and from the check file
The workers is use to check whether the information has change its status to send the user information about the
change of status by sms messages. 

all information which we have are store in file system and is collected in the .data directory.
no external npm libraries are use for this api.
