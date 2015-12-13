/* jshint node:true */
'use strict';

var _util = require('util');
var _mqtt = require('mqtt');
var _q = require('q');
var _colors = require('colors');

module.exports = {
    /**
     * Initializes an mqtt client and returns a promise that is resolved/rejected
     * based on the result of the connection to the broker.
     *
     * @module mqttHelper
     * @method initClient
     * @param {Object} connectOptions Options that specify connection parameters
     *          for the mqtt client.
     * @return {Object} A promise that will rejected or resolved based on whether
     *          or not the connection to the mqtt broker succeeded
     */
    initClient: function(connectOptions) {
        if(!connectOptions || typeof connectOptions !== 'object') {
            throw new Error('Invalid connect options specified (arg #1)');
        }

        var def = _q.defer();

        var client = _mqtt.connect(connectOptions.endpoint, {
            clientId: connectOptions.id,
            username: connectOptions.username,
            password: connectOptions.password,
            clean: true
        });

        client.on('connect', function() {
            def.resolve(client);
        });

        client.on('error', function(err) {
            var message = _util.format('Error connecting to mqtt broker.\nDetails: [%s]', err.toString());
            def.reject(message);
        });

        return def.promise;
    }
};
