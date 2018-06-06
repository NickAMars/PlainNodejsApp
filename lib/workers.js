/**
*Worker-related tasks
* List all available checks in the directory
*/
//Dependencies
const path    = require('path'),
      fs      = require('fs'),
      _data   = require('./data'),
      https   = require('https'),
      http    = require('http'),
      helpers = require('./helpers'),
      url     = require('url');

      // workers object
      const workers = {}

      //look Up all checks, get their data, send to a validator
      workers.gatherAllChecks = function (){
        // gets all the checks
        _data.list('checks', function(err, checks){ // checks the id of all the checks

          if(!err && checks && checks.length > 0){
            checks.forEach(function(check){ // loop throw all the check ids
              // read in check data
              _data.read('checks', check, function(err, originalCheckData){  // get the object associated with the checks
                if(!err && originalCheckData){
                  // Pass it  to check validator
                  workers.validateCheckData(originalCheckData); // take each object and send them to the validator
                }else{
                console.log("Error reading one of the check's data");
                }
              });
            });
          }else{ // no list or err called
            console.log('Error : could not find any checks to process');
          }
        });
      };
      // accepts check data
      workers.validateCheckData = function (originalCheckData){
        originalCheckData               = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
        originalCheckData.id            = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20? originalCheckData.id.trim() : false;
        originalCheckData.userPhone     = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10? originalCheckData.userPhone.trim() : false;
        originalCheckData.protocol      = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1? originalCheckData.protocol : false;
        originalCheckData.url           = typeof(originalCheckData.url ) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
        originalCheckData.method        = typeof(originalCheckData.method ) == 'string' && ['get', 'put', 'post', 'delete'].indexOf(originalCheckData.method ) > -1? originalCheckData.method : false;
        originalCheckData.successCodes  = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
        originalCheckData.timeoutSecond = typeof(originalCheckData.timeoutSecond) == 'number' && originalCheckData.timeoutSecond % 1 === 0 && originalCheckData.timeoutSecond >= 1 && originalCheckData.timeoutSecond <= 5 ? originalCheckData.timeoutSecond : false;

        //console.log(originalCheckData);
          //set the  state and timestamp keys for the check object


        originalCheckData.state       = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1? originalCheckData.state : 'down';
        originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
          //if check pass go to the next process
          if(originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol &&
            originalCheckData.url && originalCheckData.method && originalCheckData.successCodes && originalCheckData.timeoutSecond){
              //Perform ,look at the url make the http request to that url record and outcome
              //send original check data and outcome of the check to the next process
            workers.performCheck(originalCheckData);
          }else{
            console.log('Error: One of the checks is not properly formatted. Skipping it.');
          }

      };
//Perform the check, send the check data and the outcome to the next step of the process
      workers.performCheck = function (originalCheckData){

        let checkOutcome = {
          'error'        : false, // error in process
          'responseCode' : false, // responseCode
        };
        // outcome not sent
        let outcomeSent = false;
        // reconstruct the url
        const parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
        // hostName
        const hostName = parsedUrl.hostName;
        // path
        const path = parsedUrl.path;
          // Request
        const requestDetails = {
          'protocol'        : originalCheckData.protocol+':',
          'hostName'        : hostName,
          'method'          : originalCheckData.method.toUpperCase(),
          'path'            : path,
          'timeoutSecond'   : originalCheckData.timeoutSecond * 1000
        };
        //Instanciate the request object
          const _moduleToUse = originalCheckData.protocol == 'http'? http : https;
          const req = _moduleToUse.request(requestDetails, function(res){
            //Grab status of the sent request
            const status = res.statusCode;
            checkOutcome.responseCode = status;
          //  console.log(status);
            if(!outcomeSent){
              workers.processCheckOutcome(originalCheckData, checkOutcome);
              outcomeSent = true;
            }
          });
          // bind to the error so that it doesnt get thrown
          req.on('error', function(e){
            checkOutcome.error = {
              'error' : true,
              'value' : e
            };
            if(!outcomeSent){
              workers.processCheckOutcome(originalCheckData, checkOutcome);
              outcomeSent = true;
            }
          });
          // bind to the timeout event
          req.on('timeout', function(e){
            checkOutcome.error = {
              'error' : true,
              'value' : 'timeout'
            };
            if(!outcomeSent){
              workers.processCheckOutcome(originalCheckData, checkOutcome);
              outcomeSent = true;
            }
          });
          req.end(); // sending the request
      };
      // process check outcome, update the check data as needed, trigger an alert if needed
      // Special logic for accomodating a check that has never been tested before ( dont alert on that )
      workers.processCheckOutcome = function (originalCheckData, checkOutcome){
        // if check consider up or down
        //console.log(checkOutcome);
        const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1? 'up': 'down';
        // Descide if an alert is warranted
        const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
        // update the check data
        const newCheckData   = originalCheckData;
        newCheckData.state = state;
        newCheckData.lastChecked = Date.now();
        // save the updates
        _data.update('checks', newCheckData.id, newCheckData, function(err){
          if(!err){
            // send the new check data to the next phase in the process if needed
            if(alertWarranted){
              workers.alertUserToStatusChange(newCheckData);
            }else {
              console.log('Check outcome has not changed, no alert needed');
            }
          }else {
            console.log("Error trying save updates to one")
          }
        });
      };
      //Alert the user to change in check status
      workers.alertUserToStatusChange = function(newCheckData){

        const msg = 'Alert: Your check for '+ newCheckData.method.toUpperCase()+ ' ' + newCheckData.protocol + '://'+ newCheckData.url + 'is currently ' + newCheckData.state;
        helpers.sendTwilioSms(newCheckData.userPhone, msg , function(err){
          if(!err){
            console.log("Success: User was alerted to a status change in their check, via sms", msg);
          }else {
            console.log("Error: Could not send sms alert to user who had a state change in their check");
          }
        });
      };

      // timer to execute the worker-process once per minute
      workers.loop = function(){
              setInterval( function(){
                  workers.gatherAllChecks();
                  }, 1000 * 60); //  execute 1 per minute
      };


      workers.init = function(){
        // execute all the checks
        workers.gatherAllChecks();

        //call the loop so the checks will execute later on
        workers.loop();

      }






      //export workers
      module.exports = workers;
