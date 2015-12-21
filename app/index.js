#!/usr/bin/env node
/* jshint node:true */
'use strict';

var _util = require('util');
var _colors = require('colors');
var _shortId = require('shortid');
var _q = require('q');
var _asciimo = require('asciimo').Figlet;

var _argParser = require('./arg-parser');
var _mqttHelper = require('./mqtt-helper');
var Shell = require('./shell');

var _package = require('../package.json');


var showBanner = _q.defer();
_asciimo.write('Thing Commander', 'Cybermedium', function(art) {
    var version = (new Array(60)).join(' ') + 'v' + _package.version;
    console.log((new Array(72)).join('-').white);
    console.log(art.blue + version.yellow);
    console.log((new Array(72)).join('-').white);
    console.log();
    showBanner.resolve();
});

showBanner.promise
.then(_argParser.ensureArgs.bind(_argParser))
.then(function() {
    var options = {
        id: 'console_' + GLOBAL.config.cfg_session_id,
        endpoint: GLOBAL.config.cfg_broker_endpoint
    };
    if(!GLOBAL.config.cfg_is_anonymous) {
        options.username = GLOBAL.config.cfg_username;
        options.password = GLOBAL.config.cfg_password;
    }
    return _mqttHelper.initClient(options);
}).then(function(client) {
    var clientId = client.options.clientId;
    console.log(_util.format('Client connected to mqtt broker: [%s] [%s]',
                                clientId, GLOBAL.config.cfg_broker_endpoint).white);
    var shell = new Shell(client,
                            GLOBAL.config.cfg_gateway,
                            GLOBAL.config.cfg_username,
                            GLOBAL.config.cfg_session_id);
    return shell.launch(client).fin(function() {
        var def = _q.defer();
        console.log(_util.format('Terminating client: [%s]', clientId).white);
        client.end(function() {
            console.log(_util.format('Client terminated: [%s]', clientId).white);
            def.resolve();
        });

        return def.promise;
    });
}).catch(function(err) {
    console.error('Unhandled error occurred. Terminating program.'.red);
    console.error(err.toString().red);
    process.exit(1);
}).fin(function() {
    console.log('Waiting for handlers to be detached'.white);
}).done();

process.on('exit', function() {
    console.log('goodbye'.green);
});
