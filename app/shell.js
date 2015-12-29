/* jshint node:true */
'use strict';

var _path = require('path');
var _util = require('util');
var _promptSync = require('prompt-sync');
var _q = require('q');
var _clone = require('clone');

var Commander = require('./commander');

/**
 * Initializes a cnc shell object using the specified client to manage
 * communication with the mqtt broker.
 *
 * @class Shell
 * @constructor
 * @param {Object} client An mqtt client that has been initialized with
 *          a connection to the broker.
 * @param {String} gateway The name of the gateway that is being managed
 * @param {String} username The username associated with the gateway
 * @param {String} [sessionId] An optional session id. A random id will
 *          be generated if this parameter is not specified.
 */
function Shell(client, gateway, username, sessionId) {
    if(!client || typeof client !== 'object') {
        throw new Error('Invalid mqtt client specified (arg #1)');
    }
    if(typeof gateway !== 'string' || gateway.length <= 0) {
        throw new Error('Invalid gateway specified (arg #3)');
    }
    if(typeof username !== 'string' || username.length <= 0) {
        throw new Error('Invalid username specified (arg #2)');
    }
    if(typeof sessionId !== 'string' || sessionId.length <= 0) {
        sessionId = _shortId.generate();
    }

    var subTopic = _util.format('gateway/%s/%s/+', username, gateway);
    var subscribeHandler = this._generateSubscribeHandler(client, subTopic);

    client.on('connect', subscribeHandler);
    subscribeHandler();

    this._sessionId = sessionId;
    this._gateway = gateway;
    this._client = client;
    this._commander = new Commander(client, gateway, username, sessionId);
    this._promptDef = null;

    this._commandMap = this._buildCommandMap();
}

/**
 * @class Shell
 * @method _buildCommandMap
 * @private
 */
Shell.prototype._buildCommandMap = function() {
    var commandMap = {};
    var commander = this._commander;

    function generateCommand(commandName, method, args) {
        args = args || [];
        if(typeof method !== 'function') {
            method = commander[method].bind(commander);
        }
        commandMap[commandName] = {
            method: method,
            args: args
        };
    }

    function generateConnectorCommandFamily(commandName, methodName) {
        [
            [ '', [] ],
            [ '_all', [ 'all' ]],
            [ '_cloud', [ 'cloud' ]],
            [ '_device', [ 'device' ]]
        ].forEach(function(opts) {
            generateCommand('con:' + commandName + opts[0], methodName, opts[1]);
        });
    }

    generateConnectorCommandFamily('stop', 'stopConnector');
    generateConnectorCommandFamily('start', 'startConnector');
    generateConnectorCommandFamily('restart', 'restartConnector');
    generateConnectorCommandFamily('list', 'listConnectors');
    generateCommand('con:send_data', 'sendDataToConnector');
    generateCommand('con:update_config', 'updateConnectorConfig');
    generateCommand('con:delete_config', 'deleteConnectorConfig');
    generateCommand('con:update_type', 'updateConnectorType');

    generateCommand('agent:reset', 'resetAgent');
    generateCommand('agent:terminate', 'terminateAgent');
    generateCommand('agent:upgrade', 'upgradeAgent');
    generateCommand('agent:prov_dev', 'initAgent', {
        host: 'api-iot-dev.analoggarage.com',
        port: 8080,
        protocol: 'mqtts',
        networkInterface: 'eth0',
        currentGatewayName: this._gateway,
        newGatewayName: '',
        username: '',
        password: ''
    });
    generateCommand('agent:prov_prod', 'initAgent', {
        host: 'api-iot.analoggarage.com',
        port: 8080,
        protocol: 'mqtts',
        networkInterface: 'eth0',
        currentGatewayName: this._gateway,
        newGatewayName: '',
        username: '',
        password: ''
    });

    generateCommand('con:config_lepton', function(options) {
        options.pollFrequency = parseInt(options.pollFrequency);
        options.maxRetries = parseInt(options.maxRetries);
        if(isNaN(options.pollFrequency)) {
            options.pollFrequency = 60000;
        }
        if(isNaN(options.maxRetries)) {
            options.maxRetries = 600;
        }
        var config = {
            type: 'LeptonCamera',
            config: {
                pollFrequency: options.pollFrequency,
                spiDevice: '/dev/spidev0.1',
                i2cDevice: '/dev/i2c-1',
                maxRetries: options.maxRetries
            }
        };
        commander.updateConnectorConfig('device', options.id, config);
    }, {
        id: null,
        pollFrequency: 5000,
        maxRetries: 600
    });

    generateCommand('sys:info', 'sysInfo');
    generateCommand('sys:reboot', 'rebootGateway');

    return commandMap;
};

/**
 * @class Shell
 * @method _tabComplete
 * @private
 */
Shell.prototype._tabComplete = function(partial) {
    var matches = [];
    var commandMap = this._commandMap;

    return function(partial) {
        if(partial === '') {
            return matches;
        }

        matches.splice(0);
        for(var command in commandMap) {
            if(command.indexOf(partial) >= 0) {
                matches.push(command);
            }
        }

        return matches;
    };
};

/**
 * @class Shell
 * @method _applyArgs
 * @private
 */
Shell.prototype._applyArgs = function(defaults, userArgs) {
    defaults = defaults || [];
    userArgs = userArgs || [];
    userArgs = userArgs.slice(1);
    if(defaults instanceof Array) {
        return defaults.concat(userArgs)
    } else {
        var finalArgs = _clone(defaults);
        userArgs.forEach(function(arg) {
            var tokens = arg.split('=');
            finalArgs[tokens[0]] = tokens[1];
        });
        return [finalArgs];
    }
};

/**
 * @class Shell
 * @method _generateSubscribeHandler
 * @private
 */
Shell.prototype._generateSubscribeHandler = function(client, topic) {
    return function() {
        console.log(_util.format('Subscribing to: [%s]', topic).white);
        client.subscribe(topic);
    };
};

/**
 * @class Shell
 * @method _repl
 * @private
 */
Shell.prototype._repl = function() {
    var prompt = '>'.yellow;
    var done = false;
    var tabComplete = this._tabComplete();

    do {
        try {
            process.stdout.write(prompt);
            var resp = _promptSync.prompt({ tabComplete: tabComplete });
            resp = resp || '';
            var tokens = resp.match(/(?:[^\s']+|'[^']*')+/g);

            if(tokens instanceof Array) {
                var commandInfo = this._commandMap[tokens[0]];
                if(tokens[0] === 'q' || tokens[1] === 'quit') {
                    done = true;
                } else if(!commandInfo) {
                    console.log('bad command'.red);
                } else {
                    var args = this._applyArgs(commandInfo.args, tokens);
                    commandInfo.method.apply(null, args);
                    //this._commander[commandInfo.method].apply(this._commander, args);
                }
            }
        } catch (ex) {
            console.log(ex.toString().red);
        }
    } while(!done);
};


/**
 * Launches the shell, with an interactive user prompt.
 *
 * @class Shell
 * @method launch
 * @return {Object} A promise that will be resolved once the interactive
 *          session terminates.
 */
Shell.prototype.launch = function() {
    if(this._promptDef) {
        throw new Error('Cannot launch shell. Shell was previously launched');
    }
    this._promptDef = _q.defer();

    this._client.on('message', function(topic, message) {
        try{
            message = message.toString();
            if(message.indexOf('[error]') === 0) {
                message = message.substring(7).red;
            } else if(message.indexOf('[warn]') === 0) {
                message = message.substring(6).yellow;
            } else {
                message = message.substring(6).blue;
            }
            console.log(message);
        } catch(ex) {
            console.log(_util.format('Unable to parse message from broker', ex).red);
        }
    });

    var historyFile = _path.resolve(_path.join(__dirname, '../.tc_history'));
    _promptSync.init(historyFile);
    this._repl();
    console.log('Saving history file'.white);
    _promptSync.save();
    this._promptDef.resolve();

    return this._promptDef.promise;
};

module.exports = Shell;
