var Promise = require('bluebird');
var path = require('path');
var fs = require('fs');

function cloneOptions(o) {
	var returnObject = {};
	var keys = Object.keys(o);
	for (var i = 0; i < keys.length; i++) {
		returnObject[keys[i]] = o[keys[i]];
	}
	return returnObject;
}

function inspectOptions(options, object) {
	var output = object instanceof File ? cloneOptions(object.defaults) : cloneOptions(object.fileOptions);
	
	if (typeof options === 'number') {
		output.expires = options;
		output.cache = true;
	} else if (typeof options === 'boolean') {
		output.cache = options
	} else if (typeof options === 'object') {
		var keys = Object.keys(options);
		for (var i = 0; i < keys.length; i++) {
			output[keys[i]] = options[keys[i]];
		}
	}

	return output;
}

/**
 * A refeference to a file.
 * @constructor
 * @argument {String} filepath - The path of the file.
 * @argument {Object} [defaults=File.defaultOptions] - An object specifying default options for the object functions.
 */
function File(filepath, defaults) {

	/**
	 * The path of the file.
	 * @type {String}
	 */
	this.path = path.resolve(filepath);

	/**
	 * The file cache for storing read data
	 * @type {null|String|Buffer}
	 */
	this.cache = null;
	this.cacheTimer = null;

	/**
	 * Default values when reading or writing the file.
	 * @type {Object}
	 */
	this.defaults = typeof defaults === 'object' ? defaults : cloneOptions(File.defaultOptions);

}

/**
 * The default option values inherited by every File object.
 * @type {Object}
 */
File.defaultOptions = {
	cache: false,
	expires: 0,
	fromCache: false,
	resetTimer: true
}

/**
 * Reads the file.<br/>
 * Promise resolves to the data read by fs.readFile, and rejects to the err from the function.
 * @argument {Object|Boolean|Number} [options] - An object containing any options for the operation, if given a bool it will be passed along to options.cache and numbers to options.expires.
 * @argument {Boolean} [options.cache=true] - Whether or not the data read should be saved in File#cache.
 * @argument {Number} [options.expires=0] - The time in milliseconds untill the cache is cleared, if x > 1 the cache will not be cleared.
 * @argument {Boolean} [options.fromCache=false] - If the function should return the contents of the cache instead of reading the file.
 * @argument {Boolean} [options.resetTimer=true] - If the time should be reset or continue counting.
 * @return {Promise} - resolve => data : reject => error
 */
File.prototype.read = function (options) {
	var $ = this;

	options = inspectOptions(options || $.options, $);

	return new Promise( function (resolve, reject) {
		if ($.cache !== null) resolve($.cache);
		fs.readFile($.path, function (err, data) {
			if (err) return reject(err);
			if (options.cache) {
				$.cache = data;
				if (options.resetTimer && $.cacheTimer !== null) $.cacheTimer = (clearTimeout($.cacheTimer), null);
				if (options.expires > 0 && $.cacheTimer === null) $.cacheTimer = setTimeout(function () {
					$.cache = null;
					$.cacheTimer = null;
				}, options.expires);
			}
			resolve(data);
		});
	} );
};

/**
 * Writes data to the file.<br />
 * Promise resolves to the file object itself, and rejects to the err from the fs.writeFile function.
 * @argument {Buffer|string} data - The data that is to written to the file.
 * @argument {Object|Boolean|Number} [options] - An object containing any options for the operation, if given a bool it will be passed along to options.cache and numbers to options.expires.
 * @argument {Boolean} [options.cache=true] - Whether or not the data read should be saved in File#cache.
 * @argument {Number} [options.expires=0] - The time in milliseconds untill the cache is cleared, if x > 1 the cache will not be cleared.
 * @argument {Boolean} [options.resetTimer=true] - If the time should be reset or continue counting.
 * @return {Promise} - resolve => this : reject => error
 */
File.prototype.write = function (data, options) {
	var $ = this;
	options = inspectOptions(options || $.options, $);
	
	return new Promise( function (resolve, reject ) {
		fs.writeFile($.path, data, function (err) {
			if (err) return reject(err);
			if (options.cache) {
				$.cache = data;
				if (options.resetTimer && $.cacheTimer !== null) $.cacheTimer = (clearTimeout($.cacheTimer), null);
				if (options.expires > 0 && $.cacheTimer === null) $.cacheTimer = setTimeout(function () {
					$.cache = null;
					$.cacheTimer = null;
				}, options.expires);
			}
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
 * @argument {Object|Boolean|Number} [options] - An object containing any options for the operation, if given a bool it will be passed along to options.cache and numbers to options.expires.
 * @argument {Boolean} [options.cache=true] - Whether or not the data read should be saved in File#cache.
 * @argument {Number} [options.expires=0] - The time in milliseconds untill the cache is cleared, if x > 1 the cache will not be cleared.
 * @argument {Boolean} [options.resetTimer=true] - If the time should be reset or continue counting.
 * @return {Promise} - resolve => this : reject => error.
 */
File.prototype.append = function (data, options) {
	var $ = this;
	
	options = options = inspectOptions(options || $.options, $);

	return new Promise( function (resolve, reject) {
		fs.appendFile($.path, data, function (err) {
			if (err) return reject(err);
			else {
				if (options.cache) {
					$.cache = ($.cache || '') + data;
					if (options.resetTimer && $.cacheTimer !== null) $.cacheTimer = (clearTimeout($.cacheTimer), null);
					if (options.expires > 0 && $.cacheTimer === null) $.cacheTimer = setTimeout(function () {
						$.cache = null;
						$.cacheTimer = null;
					}, options.expires);
				}
				resolve($);
			}
		});
	} );
};

/**
 * Appends the data from a specified file. <br />
 * Promise resolves to the file object, and rejects to error.
 * @argument {string|File} file - The file that is to be appended.
 * @argument {Object|Boolean|Number} [options] - An object containing any options for the operation, if given a bool it will be passed along to options.cache and numbers to options.expires.
 * @argument {Boolean} [options.cache=true] - Whether or not the data read should be saved in File#cache.
 * @argument {Number} [options.expires=0] - The time in milliseconds untill the cache is cleared, if x > 1 the cache will not be cleared.
 * @argument {Boolean} [options.resetTimer=true] - If the time should be reset or continue counting.
 * @return {Promise} - resolve => this : reject => error.
 */
File.prototype.appendFile = function (file, options) {
	var data, $ = this;

	if (typeof options === 'undefined') options = $.defaults;

	if (file instanceof File) {
		if (file.cache) data = file.cache;
		else return file.read().then( function (data) { return $.append(data, options); } );
	} else if (typeof file === 'string') {
		var f = new File(file);
		return f.read().then( function (data) { return $.append(data, options); } );
	} else new TypeError('Invalid type of arguments[0] in File#appendFile expected string or File');
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
 * @argument {String} pathname - The path to the directory.
 * @constructor
 */
function Directory(pathname) {
	/**
	 * The path of the directory.
	 * @type {String}
	 */
    this.path = path.resolve(pathname);

	/**
	 * An object, that will be inherited by any File object, attained through this object.
	 * @type {Object}
	 */
	this.fileOptions = {
		cache: false,
		expires: 0,
		fromCache: false,
		resetTimer: true
	};
}

/**
 * Reads the contents of the directory.
 * @return {Promise} - Resolve => contents : Reject => error
 */
Directory.prototype.read = function () {
	var $ = this;
	return new Promise(function (resolve, reject) {
		fs.readdir($.path, function (err, contents) {
			if (err) return reject(err);
			resolve(contents);
		});
	});
};

/**
 * Reads a file in the directory. <br />
 * Data is stored in the objects cache.
 * @argument {string} filename - The name of the file to read.
 * @return {Promise} - Resolve => [file, data] : Reject => error
 */
Directory.prototype.readFile = function (filename, options) {
	var $ = new File(path.join(this.path, filename));
	$.options = this.fileOptions;
	return $.read(true).then(function (data) {
		return [$, data];
	});
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
	$.options = this.options;
    return $.write(data, cache || false);
};

/**
 * Creates a directory relative to the directories path.
 * @argument {string} dirname - The name of the directory.
 * @argument {boolean} [recursive=false] - If the directory should be created recursively.
 * @return {Promise} - Resolve => directory : Reject => error
 */
Directory.prototype.mkdir = function (dirname, recursive) {
	var $ = path.join(this.path, dirname);
	return Directory.make($, recursive || false);
};

/**
 * Makes a file reference relative to the directory.
 * @argument {string} file - The file path.
 * @argument {boolean} [inheritOptions=true] - Whether or not the file reference should inherit options, from the directory.
 * @return {File}
 */
Directory.prototype.getFileReference = function (file, inheritOptions) {
	var $ = new File(path.join(this.path, file));
	if (inheritOptions) $.options = this.fileOptions;
	return $;
}

/**
 * Makes a directory.
 * @argument {string} path - The path of the directory.
 * @argument {boolean} [recursive=false] - If the directory should be created recursively.
 * @return {Promise} - Resolve => directory : Reject => error
 */
Directory.make = function (dirpath, recursive) {
	recursive = recursive || false;
	return new Promise( function ( resolve, reject ) {
		if (!recursive) {
			fs.mkdir(dirpath, function (err) {
				if (err) return reject(err);
				resolve(new Directory(dirpath))
			});
		} else {
			var $s = [];
			function $ ($p) {
				fs.mkdir($p, function (err) {
					if (err && err.code === 'ENOENT') {
						$s.push($p);
						($p = $p.split('\\')).pop();
						$p = $p.join('\\');
						$($p);
					} else if (err) {
						reject(err);
					} else {
						if ($s.length !== 0) {
							$($s.pop());
						} else resolve(new Directory(dirpath));
					}
				});
			}
			$(path.win32.normalize(dirpath));
		}
	} );
};

module.exports = {File, Directory, fs : Promise.promisifyAll(fs)};