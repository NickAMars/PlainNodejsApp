const 	http 					= require('http'),
				https 				= require('https'),
			  url  					= require('url'),
				config				= require('./lib/config'),
				fs						= require('fs'),
				handlers			= require('./lib/handlers'),
				helpers 			= require('./lib/helpers'),
			  StringDecoder = require('string_decoder').StringDecoder;

//
helpers.sendTwilioSms('', 'Hello', function (err) {
	console.log('this was the err', err);
});

//Create Server
const httpServer = http.createServer((req, res) =>{
 unifidedServer(req,res);
});
// Open Port For server to listen
httpServer.listen(config.httpPort, ()=> {
		console.log('server is Working '+ config.httpPort );
});
 // pass these server options to the https server when it start to create a secure server
const httpsServerOptions = { // files from Openssl
	'key'  : fs.readFileSync('./https/key.pem'),
	'cert' : fs.readFileSync('./https/certificate.pem')
};
// Create https Server
const httpsServer = https.createServer(httpsServerOptions, (req, res) =>{
 unifidedServer(req,res);
});

// Open port for server to Listen
httpsServer.listen(config.httpsPort, ()=> {
		console.log('server is Working '+ config.httpsPort );
});


const unifidedServer = function(req, res){
	// get methods                              // gets an object
	let method = req.method.toLowerCase(), headers = req.headers;
	// gets the url
	let parsedUrl = url.parse(req.url, true);
	//get the path name             // get the object after the pathname
	let path = parsedUrl.pathname,  queryStringObject = parsedUrl.query;
	// take out the extra slashes
	let trimmedPath = path.replace(/^\/+|\/+$/g,'');
	// get the route function at the bottom (router [ pathname ]) and store it inside chosenHandler
 	let chosenHandler = typeof(router[trimmedPath]) !== 'undefined'? router[trimmedPath] : handlers.notFound;
// this is incredible
	let decoder = new StringDecoder('utf-8'); // use to convert buffer to string
	let buffer = '';
	//receives an body
	req.on('data', function(data){
		// decode buffer object into a string
		buffer += decoder.write(data);
	});
	req.on('end', function(){

		buffer += decoder.end();
		let data = {
			'trimmedPath': trimmedPath, // the pathname
			'queryStringObject': queryStringObject, // objects after the path name
			'method': method, // [ get, post , put, delete ]
			'headers': headers,
			'payload': helpers.parseJsonToObject(buffer) // body
		};

		// base on the route that was chosen
		chosenHandler(data, function(statusCode, payload){ // the callback comes from the router
			// check if its a number
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
			// check if its an object
			payload = typeof(payload) == 'object'? payload : {};
			// json to string
			let payloadString = JSON.stringify(payload);
			//parse this as if it was json
			res.setHeader('Content-Type', 'application/json');
			res.writeHead(statusCode);
			res.end(payloadString);
		});
	});
};








//Handlers
		let router = {
			'ping'  : handlers.ping,
			'users' : handlers.users,
			'tokens': handlers.tokens,
			'checks': handlers.checks
		};
