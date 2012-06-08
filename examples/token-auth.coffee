###
  Retrieve instagram feed with OAuth2 access_token
###

Instapics = require('./../lib/instapics')

pics = new Instapics token: 'OAuth2 access_token'

pics.feed count: 5, (error, data) ->
  throw new Error error if error
  console.log data