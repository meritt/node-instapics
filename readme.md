# Instapics

A Node.JS wrapper for [Instagram API](http://instagram.com/developer/).

How to use with JavaScript
--------------------------

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

Or with CoffeeScript
--------------------

```coffeescript
instapics = require 'instapics'

pics = new instapics token: 'OAuth2 access_token'

pics.feed count: 5, (error, data) ->
  throw new Error error if error
  console.log data
```

----------------

Install with NPM
----------------

	npm install instapics

How to retrieve Instagram OAuth2 access_token
---------------------------------------------

Grab latest source code and install all dev dependencies

	npm link

Change your host, client id, client secret in [examples/get-access-token.coffee](http://github.com/meritt/node-instapics/blob/master/examples/get-access-token.coffee) and after that run [examples/get-access-token.coffee](http://github.com/meritt/node-instapics/blob/master/examples/get-access-token.coffee)

	coffee examples/get-access-token.coffee

API
---

* info (*user id*, *callback*)
* recent (*user id*, *params*, *callback*)
* feed (*params*, *callback*)

Author
------

* [Alexey Simonenko](mailto:alexey@simonenko.su), [simonenko.su](http://simonenko.su)

---

## License

The MIT License, see the included `license.md` file.