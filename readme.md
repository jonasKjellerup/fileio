## Fileio
Fileio is a promise-based extension to the standard *fs* module, 
it adds two main objects, for storing file and directory references. 
The library also contains wrappers for all, callback-based, asynchronous functions 
in the *fs* module.

## Instalation
Run this command in your prefered terminal emulator.
```
npm install --save fileio
```

## Basic Promise-based io
All asynchronous callback-based functions, in the fs module, have been given a coresponding wrapper function, 
which is suffixed with *"-Async"*, so instead of ```fs.readFile``` you would use ```fs.readFileAsync```.
The modified fs module, can be accessed at fs export key: ```const {fs} = require('fileio');```

## File objects
You can store references to files using the *File* object.  
*Note: not all the standard file manipulation functions are available, for File objects. Yet.*
```
const {File} = require('fileio');

const file = new File('/Path/to/file/textfile.txt');

file.read( true ) // If set to true, the data will be saved in File#cache
    .then( data => { /* Do something with the data */ } )
    .catch( err => console.log(err) );

file.write('data to be written', false /* <- if set to true the data will also be saved in the cache */)
    .then( self => { /* do something */ })
    .catch( err => console.log(err) );
```

## Directories
The directory object allows you to easily read and write files and directories, relative to the objects path.  
*Note: not all the standard directory manipulation functions are available, for Directory objects. Yet.*
```
const {Directory} = require('fileio');

const dir1 = new Directory('./dir1');
let dir2;

Directory.make('./dir2')
    .then( main ).catch( err => console.log(err) );

function main( directoryObject ) {
    let file1, file2;
    dir2 = directoryObject;
    dir1.readFile('/relative/path/to/file') // The files content is automatically put into File#char
        .then( fileObject => file1 = fileObject ).catch( err => console.log(err) );
    dir2.writeFile('/relative/path', false /* whether to cache or not */)
        .then( fileObject => file2 = fileObject ).catch( err => console.log(err) );
}

```