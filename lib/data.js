/**
*Library for storing and editing data
* CRUD OPERATION
*/

// Dependencies
const fs      = require('fs'),
      helpers = require('./helpers'),
      querystring = require('querystring'),
      path    = require('path');

// constainer
let lib = {};
//                     base directory     ,  go to the parent folder  -> .data
lib.baseDir = path.join(__dirname,'/../.data/');

// Write data to a File
lib.create        =   function(dir,file,data, callback){
  // Open the file for writing
  fs.open(lib.baseDir+ dir +'/'+ file +'.json', 'wx', function(err, fileDescriptor){
    if(!err && fileDescriptor){
      // convert data json object to string
      let stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, function(err){
        if(!err){
          fs.close(fileDescriptor, function (err) {
            if(!err) {
              callback(false);
            } else {
              console.log('error closing new file');
            }
          });
        }else {
          callback('Error writing to new file');
        }
      });


    }else{ // leave if the file doesnt exist
      callback('Could not create new file, it may already exist');
    }
  });
};

// READ data from a file

lib.read = function (dir, file, callback){
  fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8' , function (err, data){
        if(!err && data){
          const parsedData = helpers.parseJsonToObject(data);
          callback(err, parsedData);
        }else{
          callback(err, data);
        }
  });
};
// Update data inside a file
lib.update = function(dir,file,data,callback){

  fs.open (lib.baseDir+dir+'/'+file+'.json','r+', function(err, fileDescriptor){
    if(!err && fileDescriptor){
      // Convert data to string
      let  stringData = JSON.stringify(data);

      // truncate the file
      fs.truncate(fileDescriptor, function(err){
        if(!err){
          fs.writeFile(fileDescriptor, stringData, function(err){
            if(!err){
              fs.close(fileDescriptor, function(err){
                if(!err){
                  callback(false);
                }else{
                  callback('Error closing the file');
                }
              });
            }
          });
        } else{

        }
      });
    }else{
      callback('Could not open the file for update, it may not exist yet');
    }
  });
};

//DELETE a file
lib.delete = function (dir, file, callback){
// Unlink the file
  fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(err){
    if(!err){
      callback(false);
    }else {
      callback('error deleting the file');
    }
  });
};


//List all the files in a directory
lib.list = function(dir, callback){
  fs.readdir(lib.baseDir+dir+'/', function(err, data){// data contains all the files in the directory
    if(!err && data && data.length > 0){
      const trimmedFileNames = [];
      // looping throw the file names
      data.forEach(function(fileName){
        // take off .json off the files
        //console.log(fileName);
        trimmedFileNames.push(fileName.replace('.json',''));
      });
      // send back the array of id's
      callback(false, trimmedFileNames);
    }else {
      callback(err, data);
    }
  });
}

// export
module.exports = lib;
