const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');

function File(filepath) {
	this.path = path.resolve(filepath);
	this.cache = null;
}

File.prototype.read = function (cache) {
	if (typeof cache === 'undefined') cache = false;
	let $ = this;
	return new Promise( (resolve, reject) => {
		fs.readFile($.path, (err, data) => {
			if (err) return reject(err);
			if (cache) $.cache = data;
			resolve(data);
		});
	} );
};

File.prototype.write = function (data, cache) {
	if (typeof data !== 'string' && !(data instanceof Buffer))
	throw new TypeError('Expected first argument in File#write to be of type string or Buffer' +
		' received: ' + typeof data);
	if (typeof cache === 'undefined') cache = false;
	let $ = this;
	return new Promise( (resolve, reject ) => {
		fs.writeFile($.path, data, function (err) {
			if (err) return reject(err);
			if (cache) $.cache = data;
			resolve($);
		});
	} );
};

File.prototype.copyTo = function (target) {
	let $, self = this;

	if (target instanceof File)
		$ = target.path;
	else if (typeof target === 'string')
		$ = target;
	else throw new TypeError('Invalid type of target in File#copyTo expected string or File.');

	let inStream = fs.createReadStream(this.path);
	let outStream = fs.createWriteStream($);

	return new Promise( (resolve, reject) => {
		inStream.on('error', reject);
		outStream.on('error', reject);
		outStream.on('close', () => resolve(self));
		inStream.pipe(outStream);
	} );
};

File.prototype.moveTo = function (target) {
	return this.copyTo(target).then($ => $.remove()).then($ => ($.path = target.path || target, $));
}

File.prototype.remove = function () {
	let $ = this;
	return new Promise( (resolve, reject) => {
		fs.unlink($.path, (err) => {
			if (err) return reject(err);
			resolve($);
		});
	} );
};

File.prototype.append = function (data, cache) {
	let $ = this;
	cache = cache || false;
	return new Promise( (resolve, reject) => {
		fs.appendFile($.path, data, (err) => {
			if (err) return reject(err);
			else {
				if (cache && $.cache) $.cache += data;
				resolve($);
			}
		});
	} );
};

File.prototype.appendFile = function (file, cache) {
	let data, $ = this;
	if (file instanceof File) {
		if (file.cache) data = file.cache;
		else return file.read().then( data => $.append(data, cache) );
	} else if (typeof file === 'string') {
		let f = new File(file);
		return f.read().then( data => $.append(data, cache) );
	} else new TypeError('Invalid type of file in File#appendFile expected string or File');
};

File.prototype.stat = function () {
	let $ = this;
	return new Promise( ( resolve, reject ) => {
		fs.stat($.path, (err, stats) => {
			if (err) return reject(err);
			else resolve(stats);
		});
	} );
};

File.prototype.getSize = function (outputFormat) {
	if (!outputFormat || typeof outputFormat !== 'number') outputFormat = 0;
	return new Promise ( ( resolve, reject ) => {
		$.stat().then(stats => {
			resolve(stats['size']/math.pow(10, 3 * outputFormat));
		}).catch(reject);
	} );
};

File.prototype.link = function (path) {
	let $ = this;
	if (typeof path !== string) throw new TypeError('Expected path in File#link to be of type string');
	return new Promise( ( resolve, reject ) => {
		fs.link( $.path, path, ( err ) => {
			if (err) return reject(err);
			resolve($);
		} );
	} );
};

function Directory(pathname) {
    this.path = path.resolve(pathname);
}

Directory.prototype.readFile = function (filename) {
	let $ = new File(path.join(this.path, filename));
	return $.read(true).then(() => $);
};

Directory.prototype.writeFile = function (filename, data, cache) {
	let $ = new File(path.join(this.path, filename));
    return $.write(data, cache || false);
};

Directory.prototype.mkdir = function (dirname) {
	let $ = path.join(this.path, dirname);
	return Directory.make($);
};

Directory.make = function (path) {
	return new Promise( ( resolve, reject ) => {
		fs.mkdir(path, err => {
			if (err) reject(err);
			resolve(new Directory(path))
		});
	} );
};

module.exports = {File, Directory, ...Promise.promisifyAll(fs)};