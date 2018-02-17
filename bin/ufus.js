#!/usr/bin/env node

"use strict";


/**
 * Module dependencies.
 */

var R = require('ramda');
var CLI = require('clui')
var program = require('commander')
var qs = require('querystring')
var request = require('request')
var log = require('../utils/util').log
var read = require('../utils/util').read

var Spinner = CLI.Spinner

process.env.INIT_CWD = process.cwd()

/**
 * Initialize a new `Ufus`.
 *
 * @param {String} version
 * @api public
 */

function Ufus(version) {
  if (!(this instanceof Ufus)) {
    return new Ufus(arguments[0])
  }

  this._apiURL = 'http://api.ufus.cc/v1'
  this.version = 'ufus ' + version
  this.options = null
}


/**
 * [help]
 * Ouput program examples.
 *
 *
 * @return {null}
 * @api private
 */

Ufus.prototype.help = function() {
  log(read().toString())
}


/**
 * [_request Make API request]
 * Make the specified API request and return HTML data or quit with an error.
 *
 *
 * @param {string}  path   (required)
 * @param {object}  params (required)
 * @param {object}  data   (optional)
 * @param {string}  method (optional) defaults. 'GET'
 * @return {mixed}
 * @api private
 */
Ufus.prototype._request = function(opts, callback) {
  var status = new Spinner('Fetching, Please Wait...  ')
  var dumps = {}
  var method, path, params

  if (typeof opts === 'function') {
    callback = opts
  }

  if (typeof opts === 'object') {
  	dumps = R.merge(dumps, opts)
  }

  method = dumps.method || 'GET'
  path = dumps.path ? '/' + dumps.path : ''
  params = dumps.params ? '?' + qs.stringify(dumps.params) : ''

  var options = {
    url: this._apiURL + path + params,
    method: method,
    form: method == 'GET' ? {} : dumps.data,
    headers: method == 'GET' ? {} : {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': dumps.data.length
    }
  }

  function fn(error, response, body) {
    if (error) {
      status.stop()
      return callback(error)
    }

    if (response.statusCode != 200) {
      status.stop()
      log('Error occurred. Please try again or check --help.', 'warn')
      log('If the problem persists, please email r@akinjide.me.', 'warn')
      process.exit(1)
    }

    status.stop()
    return callback(null, response.body)
  }

  status.start()
  request(options, fn)
}


/**
 * [_parse]
 * Manipulate and return usable data.
 *
 *
 * @param {string}    content  (required)
 * @return {object}
 * @api private
 */

Ufus.prototype._parse = function(content) {
	try {
		return R.pick(['hash', 'long_url', 'short_url', 'clicks'], JSON.parse(content))
	} catch (error) {
		log(error, 'error')
		process.exit(1)
	}
}


/**
 * [_responseHandler]
 * Handle response from API as callback.
 *
 *
 * @param {object}    err  (required)
 * @param {object}    response  (required)
 * @return {null}
 * @api private
 */

Ufus.prototype._responseHandler = function(err, response) {
	if (err) {
		log('Oops! Catastrophic Failure', 'error')
		log('If the problem persists, please email r@akinjide.me.', 'error')
		process.exit(1)
	} else if (R.isEmpty(response)) {
		log('Error connecting. Please check network and try again.', 'warn')
		log('If the problem persists, please email r@akinjide.me.', 'warn')
		process.exit(1)
	} else {
		var content = this._parse(response)

		switch (this.options.output) {
			case 'plain':
				log(content[this.options.key], 'log')
				break;
			case 'json':
				log(JSON.stringify(content, null, 2), 'log')
				break
			default:
				log(this.options.output + '(1) does not exist. try --help or run with --ouput json\n', 'warn')
				process.exit(1)
		}
	}
}


/**
 * [shorten]
 * Shortens link.
 *
 *
 * @param {string}  longUrl  (required)
 * @param {object}  options.output  (optional) defaults. 'plain'
 * @return {null}
 * @api public
 */

Ufus.prototype.shorten = function(longUrl, options) {
	this.options = R.merge(options, { key: 'short_url' })
  this._request({
  	path: 'shorten',
  	method: 'POST',
  	data: { 'long_url': longUrl }
  }, this._responseHandler.bind(this))
}


/**
 * [swell]
 * Expand shortened link.
 *
 *
 * @param {string}  shortUrl  (required)
 * @param {object}  options.output  (optional) defaults. 'plain'
 * @return {null}
 * @api public
 */

Ufus.prototype.swell = function(shortUrl, options) {
	this.options = R.merge(options, { key: 'long_url' })
  this._request({
  	path: 'burst',
  	method: 'POST',
  	data: { 'short_url': shortUrl }
  }, this._responseHandler.bind(this))
}


/**
 * Handle programmer input, and do stuffs.
 */

var ufus = new Ufus('1.0.0')

program
  .version(ufus.version)
  .description('ultra fast URL shortener in your terminal! (http://www.ufus.cc/).')
  .on('--help', ufus.help)

program
  .command('shorten [long_url]')
  .alias('s')
  .description('specify long URL to shorten [www.google.com]')
  .option('-o, --output [type]', 'Specify output type (json|plain) [json]', /^(json|plain)$/i, 'plain')
  .action(ufus.shorten.bind(ufus))

program
  .command('swell [short_url]')
  .alias('x')
  .description('specify short URL to expand [ufus.cc/6nyx]')
  .option('-o, --output [type]', 'Specify output type (json|plain) [json]', /^(json|plain)$/i, 'plain')
  .action(ufus.swell.bind(ufus))

program.parse(process.argv)

var pkgs = program.args
if (!pkgs.length) program.help()