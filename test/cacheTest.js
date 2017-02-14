const {File} = require('../fileio');

const f = new File('./testfiles/link');

f.options = {
	fromCache: true,
	cache: true,
	expires: 3000,
	resetTimer: false
};

console.log(+ new Date());

f.read()
	.then(data => {
		setTimeout(function () {
			console.log('timeout: ', + new Date());
			f.read()
				.then(data => {
					console.log('read 3: ', + new Date(), f.cache);
				})
				.catch(console.log.bind(console));
		}, 3000);
		console.log('read 1: ', + new Date());
		return f.read();
	})
	.then(data => {
		console.log('read 2: ', + new Date())
	})
	.catch(console.log.bind(console));