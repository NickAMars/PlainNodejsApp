/**
*Private file for the Api
*
*/


// Dependencies
const server 			= require('./lib/server'),
    	workers 		= require('./lib/workers');

const app = {};
// init function
app.init =function(){
	// start server
	server.init();
	// start workers
	workers.init();
};


app.init();

// export the app
module.exports =app;
