# instapics

[![NPM version](https://badge.fury.io/js/instapics.png)](http://badge.fury.io/js/instapics) [![Dependency Status](https://david-dm.org/meritt/node-instapics.png)](https://david-dm.org/meritt/node-instapics)

A node.js wrapper for [Instagram API](http://instagram.com/developer/endpoints/users/).

## Installation

```
$ npm install instapics
```

## Examples

```js
var Instapics = require('instapics');

var pics = new Instapics({
  token: 'OAuth2 access_token'
});

pics.feed({count: 5}, function(error, data) {
  if (error) {
    throw new Error(error);
  }

  console.log(data);
});
```

```coffeescript
Instapics = require 'instapics'

pics = new Instapics token: 'OAuth2 access_token'

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
* recent (user_id[, params], callback)
* feed ([params, ]callback)

## Author

* [Alexey Simonenko](mailto:alexey@simonenko.su), [simonenko.su](http://simonenko.su)

## License

The MIT License, see the included `license.md` file.

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/meritt/node-instapics/trend.png)](https://bitdeli.com/free "Bitdeli Badge")