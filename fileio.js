var Promise = require('bluebird');
var path = require('path');
var fs = require('fs');

/**
 * A refeference to a file.
 * @constructor
 * @argument {string} filepath - The path of the file.
 */
function File(filepath) {

	/**
	 * The path of the file.
	 * @type {string}
	 */
	this.path = path.resolve(filepath);

	/**
	 * The file cache for storing read data
	 * @type {null|string|Buffer}
	 */
	this.cache = null;
}

/**
 * Reads the file.<br/>
 * Promise resolves to the data read by fs.readFile, and rejects to the err from the function.
 * @argument {Boolean} [cache=false] - If the data read should be saved in the File#cache
 * @return {Promise} - resolve => data : reject => error
 */
File.prototype.read = function (cache) {
	if (typeof cache === 'undefined') cache = false;
	var $ = this;
	return new Promise( function (resolve, reject) {
		fs.readFile($.path, function (err, data) {
			if (err) return reject(err);
			if (cache) $.cache = data;
			resolve(data);
		});
	} );
};

/**
 * Writes data to the file.<br />
 * Promise resolves to the file object itself, and rejects to the err from the fs.writeFile function.
 * @argument {Buffer|string} data - The data that is to written to the file.
 * @argument {Boolean} [cache=false] - Whether or not the data written should be save to the File#cache variable.
 * @return {Promise} - resolve => this : reject => error
 */
File.prototype.write = function (data, cache) {
	if (typeof data !== 'string' && !(data instanceof Buffer))
	throw new TypeError('Expected first argument in File#write to be of type string or Buffer' +
		' received: ' + typeof data);
	if (typeof cache === 'undefined') cache = false;
	var $ = this;
	return new Promise( function (resolve, reject ) {
		fs.writeFile($.path, data, function (err) {
			if (err) return reject(err);
			if (cache) $.cache = data;
			resolve($);
		});
	} );
};

/**
 * Copies the file to a specified target destination.<br />
 * Promise resolves to the file representing the origin of the data, and rejects to any error thrown by the write/read streams.
 * @argument {string|File} target - The target path of the function.
 * @return {Promise} - resolve => this : reject => error
 */
File.prototype.copyTo = function (target) {
	var $, self = this;

	if (target instanceof File)
		$ = target.path;
	else if (typeof target === 'string')
		$ = target;
	else throw new TypeError('Invalid type of target in File#copyTo expected string or File.');

	var inStream = fs.createReadStream(this.path);
	var outStream = fs.createWriteStream($);

	return new Promise( function (resolve, reject) {
		inStream.on('error', reject);
		outStream.on('error', reject);
		outStream.on('close', function () { resolve(self); });
		inStream.pipe(outStream);
	} );
};

/**
 * Moves the file to a specified target destination.<br />
 * Promise resolves to the file object on which the function was called on, and rejects to any errors encountered along the path.<br />
 * The function modifies the original object to contain the new path.
 * @argument {string|File} target - The target destination.
 * @return {Promise} - resolve => this : reject => error.
 */
File.prototype.moveTo = function (target) {
	return this.copyTo(target).then(function ($) { return $.remove() }).then(function ($) { return ($.path = target.path || target, $)});
}

/**
 * Removes/unlinks the file.<br />
 * Promise resolves to the file object, and rejects to error.
 * @return {Promise} - resolve => this : reject => error.
 */
File.prototype.remove = function () {
	var $ = this;
	return new Promise( function (resolve, reject) {
		fs.unlink($.path, function (err) {
			if (err) return reject(err);
			resolve($);
		});
	} );
};

/**
 * Appends data to the file. <br />
 * Promise resolves to the file object, and rejects to error.
 * @argument {string|Buffer} data - The data to be appended to the file.
 * @argument {boolean} [cache=false] - Whether the appended data should be appended to the current cache, if present.
 * @return {Promise} - resolve => this : reject => error.
 */
File.prototype.append = function (data, cache) {
	var $ = this;
	cache = cache || false;
	return new Promise( function (resolve, reject) {
		fs.appendFile($.path, data, function (err) {
			if (err) return reject(err);
			else {
				if (cache && $.cache) $.cache += data;
				resolve($);
			}
		});
	} );
};

/**
 * Appends the data from a specified file. <br />
 * Promise resolves to the file object, and rejects to error.
 * @argument {string|File} file - The file that is to be appended.
 * @argument {boolean} [cache=false] - Whether the appended file should be appended to the current cache, if present.
 * @return {Promise} - resolve => this : reject => error.
 */
File.prototype.appendFile = function (file, cache) {
	var data, $ = this;
	if (file instanceof File) {
		if (file.cache) data = file.cache;
		else return file.read().then( function (data) { return $.append(data, cache); } );
	} else if (typeof file === 'string') {
		var f = new File(file);
		return f.read().then( function (data) { return $.append(data, cache); } );
	} else new TypeError('Invalid type of file in File#appendFile expected string or File');
};

/**
 * Gets the stats of the file.
 * @return {Promise} - resolve => filestats : reject => error.
 */
File.prototype.stat = function () {
	var $ = this;
	return new Promise( function ( resolve, reject ) {
		fs.stat($.path, function (err, stats) {
			if (err) return reject(err);
			else resolve(stats);
		});
	} );
};

/**
 * Gets the size of the file.
 * @argument {number} [outputFormat=0] - The format of the number returned: bytes=0, kilobytes=1, megabyte=2 ...
 * @return {Promise} - resolve => filesize : reject => error.
 */
File.prototype.getSize = function (outputFormat) {
	if (!outputFormat || typeof outputFormat !== 'number') outputFormat = 0;
	var $ = this;
	return new Promise ( function ( resolve, reject ) {
		$.stat().then( function (stats) {
			resolve(stats['size']/Math.pow(10, 3 * outputFormat));
		}, function (err) { reject(err); });
	} );
};

/**
 * Creates a link to the file.
 * @argument {string} path - The destination path of the link.
 * @return {Promise} - resolve => this : reject => error.
 */
File.prototype.link = function (path) {
	var $ = this;
	if (typeof path !== 'string') throw new TypeError('Expected path in File#link to be of type string');
	return new Promise( function ( resolve, reject ) {
		fs.link( $.path, path, function ( err ) {
			if (err) return reject(err);
			resolve($);
		} );
	} );
};

/**
 * References a directory.
 * @argument {string} pathname - The path to the directory.
 * @constructor
 */
function Directory(pathname) {
	/**
	 * The path of the directory.
	 * @type {string}
	 */
    this.path = path.resolve(pathname);
}

/**
 * Reads a file in the directory. <br />
 * Data is stored in the objects cache.
 * @argument {string} filename - The name of the file to read.
 * @return {Promise} - Resolve => file : Reject => error
 */
Directory.prototype.readFile = function (filename) {
	var $ = new File(path.join(this.path, filename));
	return $.read(true).then(function () { return $ });
};

/**
 * Writes a file in the directory.
 * @argument {string} filename - The name of the file to write to.
 * @argument {string|buffer} data - The data to write.
 * @argument {boolean} [cache=false] - whether or not the function should cache the written data.
 * @return {Promise} - Resolve => file : Reject => error
 */
Directory.prototype.writeFile = function (filename, data, cache) {
	var $ = new File(path.join(this.path, filename));
    return $.write(data, cache || false);
};

/**
 * Creates a directory relative to the directories path.
 * @argument {string} dirname - The name of the directory.
 * @return {Promise} - Resolve => directory : Reject => error
 */
Directory.prototype.mkdir = function (dirname) {
	var $ = path.join(this.path, dirname);
	return Directory.make($);
};

/**
 * Makes a directory.
 * @argument {string} path - The path of the directory.
 * @return {Promise} - Resolve => directory : Reject => error
 */
Directory.make = function (path) {
	return new Promise( function ( resolve, reject ) {
		fs.mkdir(path, function (err) {
			if (err) return reject(err);
			resolve(new Directory(path))
		});
	} );
};

module.exports = {File, Directory, fs : Promise.promisifyAll(fs)};