/**
*Create and export configuration variables
*/

let environments = {};
environments.staging= {
  'httpPort'      : 3000,
  'httpsPort'     : 3001,
  'envName'       : 'staging',
  'hashingSecret' : 'thisIsASecret',
  'maxChecks'     : 5,
  'twilio' : {
    'accountSid' : '',
    'authToken' : '',
    'fromPhone' : '+15005550006'
  } // test code works but would need to see if real thing work
};


environments.production= {
  'httpPort'      : 5000,
  'httpsPort'     : 5001,
  'envName'       : 'production',
  'hashingSecret' : 'thisIsAlsoASecret',
  'maxChecks'     : 5,
  'twilio'        : {
                    'accountSid' : '',
                    'authToken' : '',
                    'fromPhone' : ''
                    }
};
//process.env.NODE_ENV === production when deploy to heroku
let currentEnvironment  = typeof(process.env.NODE_ENV) == 'string'? process.env.NODE_ENV.toLowerCase() : '';
let environmentToExport = typeof(environments[currentEnvironment]) == 'object'? environments[currentEnvironment] : environments.staging;
// export the selected environment
module.exports = environmentToExport;
