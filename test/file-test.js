var Promise = require('bluebird');
var fileio = require('../fileio'), File = fileio.File, fs = fileio.fs;

var testoutput = {};

var file = new File('./testfiles/testfile');

function main (progress) {
    if (progress === 0) { // write
        file.write('testdata: 1234123', true)
            .then(function (file) {
                testoutput['file:write'] = {
                    status: 'success',
                    result: file.cache
                };
                file.cache = null;
                main(++progress);
            })
            .catch(function (error) {
                testoutput['file:write'] = {
                    status: 'error',
                    result: error
                };
                saveFile()
            });
    } else if (progress === 1) { // read
        file.read(true)
            .then(function (data) {
                testoutput['file:read'] = {
                    status: 'success',
                    result: { data: data.toString(), cache: file.cache.toString() }
                };
                main(++progress);
            })
            .catch(function (error) {
                testoutput['file:read'] = {
                    status: 'error',
                    result: error
                };
                saveFile()
            });
    } else if (progress === 2) { // append
        file.append('\nappend', true)
            .then(function (file) {
                testoutput['file:append'] = {
                    status: 'success',
                    result: { cache: file.cache.toString() }
                };
                main(++progress);
            })
            .catch(function (err) {
                testoutput['file:append'] = {
                    status: 'error',
                    result: error
                };
                saveFile();
            });
    } else if (progress === 3) {
        file.appendFile('./testfiles/appendfile', true)
            .then(function (file) {
                testoutput['file:appendFile'] = {
                    status: 'success',
                    result: { cache: file.cache.toString() }
                };
                main(++progress);
            })
            .catch(function (err) {
                testoutput['file:appendFile'] = {
                    status: 'error',
                    result: error
                };
                saveFile();
            });
    }else {
        saveFile();
    }
}

function saveFile() { fs.writeFileAsync('./testoutput.json', JSON.stringify(testoutput)).then(f => console.log(1)).catch(console.log.bind(console)); }

main(0)