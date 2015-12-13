/* jshint node:true */
'use strict';

var _path = require('path');
var _yargs = require('yargs');
var _prompt = require('prompt');
var _q = require('q');
var _shortId = require('shortid');

var _sessionId = _shortId.generate();

var _args = _yargs.usage('Usage: $0 [OPTIONS]')
                    .option('session-id', {
                        demand: false,
                        default: _sessionId,
                        type: 'string',
                        describe: 'An id to associate with the command session.' +
                                  '\r\n'
                    })
                    .option('broker-endpoint', {
                        demand: false,
                        default: undefined,
                        type: 'string',
                        describe: 'URL to the mqtt broker for command and control.' +
                                  'User will be propmted for this value if not specified' +
                                  'on the command line.' +
                                  '\r\n'
                    })
                    .option('gateway', {
                        demand: false,
                        default: undefined,
                        type: 'string',
                        describe: 'The name of the gateway to manage via the commander.' +
                                  'User will be propmted for this value if not specified' +
                                  'on the command line.' +
                                  '\r\n'
                    })
                    .option('username', {
                        demand: false,
                        default: undefined,
                        type: 'string',
                        describe: 'The username to use when connecting to the mqtt broker.' +
                                  'User will be propmted for this value if not specified' +
                                  'on the command line.' +
                                  '\r\n'
                    })
                    .option('password', {
                        demand: false,
                        default: undefined,
                        type: 'string',
                        describe: 'The password to use when connecting to the mqtt broker.' +
                                  'User will be propmted for this value if not specified' +
                                  'on the command line.' +
                                  '\r\n'
                    })
                    .help('help')
                    .alias('help', 'h')
                    .describe('help', 'Show application usage help')
                    .argv;


function _getPromptSchemaForMissingArgs(args) {
    var properties = { };
    if(!_args.brokerEndpoint) {
        properties.brokerEndpoint = {
            description: 'Broker endpoint:'.blue,
            type: 'string',
            pattern: /^mqtts?:\/\/[A-Za-z0-9-_.:]+/,
            message: 'Broker endpoint must begin with mqtt:// or mqtts://, followed by a valid uri'.red,
            required: true
        }
    }

    if(!_args.gateway) {
        properties.gateway = {
            description: 'Gateway:'.blue,
            type: 'string',
            message: 'A valid gateway name must be specified'.red,
            required: true
        }
    }

    if(!_args.username) {
        properties.username = {
            description: 'Username:'.blue,
            type: 'string',
            message: 'A valid username must be specified'.red,
            required: true
        }
    }

    if(!_args.password) {
        properties.password = {
            description: 'Password:'.blue,
            hidden: true,
            type: 'string',
            message: 'A valid password must be specified'.red,
            required: true
        }
    }

    return { properties: properties };
}


module.exports = {
    /**
     * Gets arguments for the program, by examining command line arguments,
     * and prompting the user for required arguments that have not been specified.
     *
     * @module argParser
     * @method ensureArgs
     * @return {Object} A promise that will be rejected or resolved based on
     *          the outcome of the argument extraction process.
     */
    ensureArgs: function() {
        var def = _q.defer();
        var schema = _getPromptSchemaForMissingArgs(_args);
        _prompt.message = '[connection]'.yellow;
        _prompt.delimiter = ' ';
        _prompt.start();
        _prompt.get(schema, function(err, data) {
            if(err) {
                return def.reject(err);
            }
            for(var property in schema.properties) {
                _args[property] = data[property];
            }
            GLOBAL.config = {
                cfg_broker_endpoint: _args.brokerEndpoint,
                cfg_gateway: _args.gateway,
                cfg_username: _args.username,
                cfg_password: _args.password,
                cfg_session_id: _args.sessionId
            };
            def.resolve();
        });

        return def.promise;
    }
};
