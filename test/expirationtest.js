const File = require('../fileio').File;

const f = new File('testfiles/appendfile');
f.defaults = {
	expires: 6000,
	cache: true
};

f.appendFile('testfiles/link').then(function ($) {
	console.log($);
	setTimeout(function () {console.log($);}, 6000);
}).catch(console.log);