// Generated by CoffeeScript 1.7.1
(function() {
  var Instapics, qs, xhr;

  xhr = require('request');

  qs = require('querystring');

  Instapics = (function() {
    var apihost, isFunction, request, version;

    apihost = 'https://api.instagram.com';

    version = 'v1';

    function Instapics(options) {
      this.options = options != null ? options : {};
    }

    Instapics.prototype.info = function(userid, fn) {
      if (!userid || parseInt(userid, 10) <= 0) {
        throw new Error('You should enter a valid user id');
      }
      this.scheme = "/users/" + userid;
      return request(this, {}, fn);
    };

    Instapics.prototype.recent = function(userid, params, fn) {
      if (!userid || parseInt(userid, 10) <= 0) {
        throw new Error('You should enter a valid user id');
      }
      if (isFunction(params)) {
        fn = params;
        params = {};
      }
      this.scheme = "/users/" + userid + "/media/recent";
      return request(this, params, fn);
    };

    Instapics.prototype.feed = function(params, fn) {
      if (isFunction(params)) {
        fn = params;
        params = {};
      }
      this.scheme = '/users/self/feed';
      return request(this, params, fn);
    };

    request = function(self, query, fn) {
      var params;
      if (query == null) {
        query = {};
      }
      if (fn == null) {
        fn = function() {};
      }
      query = qs.stringify(query);
      if (query !== '') {
        query = "&" + query;
      }
      params = {
        url: "" + apihost + "/" + version + self.scheme + "?access_token=" + self.options.token + query
      };
      return xhr(params, function(error, request, body) {
        var data;
        body = body ? JSON.parse(body) : {};
        if (body.meta && body.meta.code !== 200) {
          error = body.meta;
        }
        data = body.data != null ? body.data : null;
        return fn.call(self, error, data);
      });
    };

    isFunction = function(object) {
      return '[object Function]' === toString.call(object);
    };

    return Instapics;

  })();

  module.exports = Instapics;

}).call(this);
