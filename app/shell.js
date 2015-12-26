/* jshint node:true */
'use strict';

var _util = require('util');
var _prompt = require('prompt');
var _q = require('q');

var Commander = require('./commander');

function _buildPrompt(component) {
    return function() {
        _prompt.get([ {
            name: 'command',
            description: ' '
        } ], function(err, results) {
            if(err) {
                console.log(_util.format('Error:', err).red);
                results = null;
            }
            component._processCommand(results);
        });
    }.bind(component);
}

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
    client.subscribe(subTopic);

    this._sessionId = sessionId;
    this._gateway = gateway;
    this._client = client;
    this._commander = new Commander(client, gateway, username, sessionId);
    this._showPrompt = _buildPrompt(this);
    this._promptDef = null;
}

/**
 * @class Shell
 * @method _processCommand
 * @private
 */
Shell.prototype._processCommand = function(userResp) {
    if(!userResp || typeof userResp !== 'object' || 
        typeof userResp.command !== 'string' || userResp.command.length <= 0) {
        return this._showPrompt();
    }

    var tokens = userResp.command.match(/(?:[^\s']+|'[^']*')+/g);

    try {
        switch(tokens[0]) {
            case 'quit':
            case 'q':
            case 'exit':
            case 'bye':
                this._promptDef.resolve(this);
                return;

            //STOP commands
            case 'stp':
                this._commander.stopConnector(tokens[1], tokens[2]);
                break;
            case 'stc':
                this._commander.stopConnector('cloud', tokens[1]);
                break;
            case 'std':
                this._commander.stopConnector('device', tokens[1]);
                break;

            //START commands
            case 'str':
                this._commander.startConnector(tokens[1], tokens[2]);
                break;
            case 'src':
                this._commander.startConnector('cloud', tokens[1]);
                break;
            case 'srd':
                this._commander.startConnector('device', tokens[1]);
                break;

            //RESTART commands
            case 'rst':
                this._commander.restartConnector(tokens[1], tokens[2]);
                break;
            case 'rsc':
                this._commander.restartConnector('cloud', tokens[1]);
                break;
            case 'rsd':
                this._commander.restartConnector('device', tokens[1]);
                break;

            //LIST commands
            case 'lst':
                this._commander.listConnectors(tokens[1]);
                break;
            case 'lsc':
                this._commander.listConnectors('cloud');
                break;
            case 'lsd':
                this._commander.listConnectors('device');
                break;

            //CONNECTOR commands
            case 'sdc':
                this._commander.sendDataToConnector(tokens[1], tokens[2], tokens[3]);
                break;
            case 'ucc':
                this._commander.updateConnectorConfig(tokens[1], tokens[2], tokens[3]);
                break;
            case 'dcc':
                this._commander.deleteConnectorConfig(tokens[1], tokens[2]);
                break;
            case 'uct':
                this._commander.updateConnectorType(tokens[1], tokens[2]);
                break;

            case 'sys':
                this._commander.sysInfo(this._gateway);
                break;
            case 'rsa':
                this._commander.resetAgent(this._gateway);
                break;

            //TERMINATE program commands
            case 'trm':
                this._commander.terminateAgent();
                break;

            //UPGRADE commands
            case 'upg':
                this._commander.upgradeAgent();
                break;

           case 'rbt':
               this._commander.rebootGateway();
               break;

            // Provisioning commands
            case 'prv':
                var options = {
                    host: (tokens[1] === 'prod')? 'api-iot.analoggarage.com':
                                                    'api-iot-dev.analoggarage.com',
                    newGatewayname: tokens[2],
                    username: tokens[3],
                    password: tokens[4],
                    currentGatewayName: this._gateway,
                    port: tokens[5] || 8080,
                    protocol: 'mqtts',
                    networkInterface: 'eth0'
                };
                this._commander.provisionGateway(options);
                break;
            default:
                console.log('bad command'.red);
                break;
        }
    } catch (ex) {
        console.log(ex.toString().red);
    }

    this._showPrompt();
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

    _prompt.message = '[tc]'.yellow;
    _prompt.delimiter = '';

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
    this._showPrompt();

    return this._promptDef.promise;
};

module.exports = Shell;
