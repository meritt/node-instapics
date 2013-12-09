# instapics

[![NPM version](https://badge.fury.io/js/instapics.png)](http://badge.fury.io/js/instapics) [![Dependency Status](https://david-dm.org/meritt/node-instapics.png)](https://david-dm.org/meritt/node-instapics)

A Node.JS wrapper for [Instagram API](http://instagram.com/developer/).

## Installation

```
$ npm install instapics
```

## Examples

```javascript
var instapics = require('instapics');

var pics = new instapics({token: 'OAuth2 access_token'});

pics.feed({count: 5}, function(error, data) {
  if (error) {
    throw new Error(error);
  }

  return console.log(data);
});
```

```coffeescript
instapics = require 'instapics'

pics = new instapics token: 'OAuth2 access_token'

pics.feed count: 5, (error, data) ->
  throw new Error error if error
  console.log data
```

## How to retrieve instagram OAuth2 access_token

Grab latest source code and install all dev dependencies

```
$ npm link
```

Change your host, client id, client secret in [examples/get-access-token.coffee](http://github.com/meritt/node-instapics/blob/master/examples/get-access-token.coffee) and after that run [examples/get-access-token.coffee](http://github.com/meritt/node-instapics/blob/master/examples/get-access-token.coffee)

```
$ coffee examples/get-access-token.coffee
```

## API

* info (user_id, callback)
* recent (user_id, params, callback)
* feed (params, callback)

## Author

* [Alexey Simonenko](mailto:alexey@simonenko.su), [simonenko.su](http://simonenko.su)

## License

The MIT License, see the included `license.md` file.
