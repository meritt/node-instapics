###
  node-instapics
  (c) 2012 Alexey Simonenko, Serenity LLC.
###

# Constructor
xhr = require 'request'
qs  = require 'querystring'

class Instapics
  apihost = 'https://api.instagram.com'
  version = 'v1'

  constructor: (@options = {}) ->

  info: (userid, fn) ->
    throw new Error 'You should enter a valid user id' if not userid or parseInt(userid, 10) <= 0

    @scheme = "/users/#{userid}"
    request @, {}, fn

  recent: (userid, params, fn) ->
    throw new Error 'You should enter a valid user id' if not userid or parseInt(userid, 10) <= 0

    if isFunction params
      fn = params
      params = {}

    @scheme = "/users/#{userid}/media/recent"
    request @, params, fn

  feed: (params, fn) ->
    if isFunction params
      fn = params
      params = {}

    @scheme = '/users/self/feed'
    request @, params, fn

  request = (self, query = {}, fn = ->) ->
    query = qs.stringify query
    query = "&#{query}" if query isnt ''

    params = url: "#{apihost}/#{version}#{self.scheme}?access_token=#{self.options.token}#{query}"

    xhr params, (error, request, body) ->
      body  = if body then JSON.parse body else {}
      error = body.meta if body.meta and body.meta.code isnt 200
      data  = if body.data? then body.data else null

      fn.call self, error, data

  isFunction = (object) -> '[object Function]' is toString.call object

module.exports = Instapics