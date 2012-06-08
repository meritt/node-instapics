express   = require 'express'
everyauth = require 'everyauth'

everyauth.debug = true;

options =
  host:   'http://localhost:3000' # change this
  id:     '-- client id --'       # change this
  secret: '-- client secret --'   # change this

current = token = null

everyauth.instagram.myHostname   options.host
everyauth.instagram.redirectPath '/'
everyauth.instagram.appId        options.id
everyauth.instagram.appSecret    options.secret
everyauth.instagram.scope        'basic'
everyauth.instagram.findOrCreateUser (session, accessToken, accessTokenExtra, user) ->
  [token, current] = [accessToken, user]

app = express.createServer()

app.use express.bodyParser()
app.use express.cookieParser()
app.use express.session secret: 'node-instapics'
app.use everyauth.middleware()

app.set 'views', __dirname + '/views'
app.set 'view engine', 'ejs'
app.set 'view options', layout: false

app.get '/', (request, response) ->
  if not request.loggedIn
    response.render 'login'
  else
    response.render 'result'
      login: current.username
      name:  current.full_name
      id:    current.id
      token: token

everyauth.helpExpress app

app.listen 3000
console.log 'Go to ' + options.host