const {File} = require('../fileio');
const Promise = require('bluebird');

const f = new File('file-test.js');

function psetTimeout(time) {
	return new Promise(resolve => {
		setTimeout(resolve, time);
	});
}

console.log('Read one: ', f.defaults);
f.read()
	.then(data => {
		console.log('Read one - data: ', data);
		console.log('Read one - cache: ', f.cache);

		f.defaults.cache = true;
		console.log('Read two: ', f.defaults);
		return f.read();
	})
	.then(data => {
		console.log('Read two - data: ', data);
		console.log('Read two - cache: ', f.cache);

		f.defaults.expires = 6000;
		console.log('Read three: ', f.defaults);
		return f.read();
	})
	.then(data => {
		console.log('Read three - data: ', data);
		console.log('Read three - cache: ', f.cache);

		return psetTimeout(6000);
	})
	.then(() => {
		console.log('Read three - cache - 6000: ' + f.cache);
	})
	.catch(err => console.log('Read failed: ', err));