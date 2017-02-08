const File = require('../fileio').File;

const f = new File('file-test.js');
f.read({
	cache: true,
	expires: 6000
}).then(function () {
	console.log(f.cache);
	setTimeout(function () { console.log(f); }, 8000);
});