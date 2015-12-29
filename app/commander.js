/* jshint node:true */
'use strict';

var _util = require('util');
var _shortId = require('shortid');

/**
 * Represents a command processor object that can issue commands to
 * a specific gateway via the mqtt broker.
 *
 * @class Commander
 * @constructor
 * @param {Object} client An mqtt client that has been initialized with
 *          a connection to the broker.
 * @param {String} gateway The name of the gateway that is being managed
 * @param {String} username The username associated with the gateway
 * @param {String} [sessionId] An optional session id. A random id will
 *          be generated if this parameter is not specified.
 */
function Commander(client, gateway, username, sessionId) {
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

    this._client = client;
    this._topicPrefix = _util.format('cloud/%s/%s/', username, gateway);
    this._requestCounter = 0;
    this._sessionId = sessionId;
}

/**
 * @class Commander
 * @method _getNextRequestId
 * @private
 */
Commander.prototype._getNextRequestId = function() {
    this._requestCounter++;
    return this._sessionId + '::' + this._requestCounter;
};

/**
 * @class Commander
 * @method _sendPayload
 * @private
 */
Commander.prototype._sendPayload = function(payload, requestId) {
    requestId = requestId || this._getNextRequestId();

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
};

/**
 * Issues a stop command for a specific connector, or a group of connectors
 * via the mqtt broker.
 *
 * @class Commander
 * @method stopConnector
 * @param {String} [category] The category of the connector to start. Can be omitted
 *          if the id is "all".
 * @param {String} [id] The id of the connector to start. If omitted, a "stop all"
 *          command will be issued with the specified category.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.stopConnector = function(category, id, requestId) {
    if(category === 'all') {
        id = category;
        category = undefined;
    } else if (id === 'all') {
        category = undefined;
    } else if (category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    id = id || 'all';

    var payload = {
        category: category,
        action: (id === 'all')? 'stop_all_connectors':'stop_connector',
        id: (id === 'all')? undefined: id
    };

    this._sendPayload(payload, requestId);
};

/**
 * Issues a start command for a specific connector, or a group of connectors
 * via the mqtt broker.
 *
 * @class Commander
 * @method startConnector
 * @param {String} [category] The category of the connector to start. Can be omitted
 *          if the id is "all".
 * @param {String} [id] The id of the connector to start. If omitted, a "start all"
 *          command will be issued with the specified category.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.startConnector = function(category, id, requestId) {
    if(category === 'all') {
        id = category;
        category = undefined;
    } else if (id === 'all') {
        category = undefined;
    } else if (category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    id = id || 'all';

    var payload = {
        category: category,
        action: (id === 'all')? 'start_all_connectors':'start_connector',
        id: (id === 'all')? undefined: id
    };

    this._sendPayload(payload, requestId);
};

/**
 * Issues a list connectors command a specific group of connectors or all connectors
 * via the mqtt broker.
 *
 * @class Commander
 * @method listConnectors
 * @param {String} [category] The category of the connectors to restart.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.listConnectors = function(category, requestId) {
    if(category !== undefined && category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    var payload = {
        category: category,
        action: 'list_connectors'
    };

    this._sendPayload(payload, requestId);
};

/**
 * Issues a restart command for a specific connector, or a group of connectors
 * via the mqtt broker.
 *
 * @class Commander
 * @method restartConnector
 * @param {String} [category] The category of the connector to restart. Can be omitted
 *          if the id is "all".
 * @param {String} [id] The id of the connector to restart. If omitted, a "restart all"
 *          command will be issued with the specified category.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.restartConnector = function(category, id, requestId) {
    if(category === 'all') {
        id = category;
        category = undefined;
    } else if (id === 'all') {
        category = undefined;
    } else if (category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    id = id || 'all';

    var payload = {
        category: category,
        action: (id === 'all')? 'restart_all_connectors':'restart_connector',
        id: (id === 'all')? undefined: id
    };

    this._sendPayload(payload, requestId);
};

/**
 * Sends a data payload to a specific connector via the mqtt broker.
 *
 * @class Commander
 * @method sendDataToConnector
 * @param {String} category The category of the connector to restart.
 * @param {String} id The id of the connector to restart.
 * @param {String} data The data to send to the connector.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.sendDataToConnector = function(category, id, data, requestId) {
    if (category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    if (typeof id !== 'string' || id.length <= 0) {
        throw new Error(_util.format('Invalid id specified: [%s]', id))
    }

    if(typeof data === 'string' && data.length >= 2) {
        data = data.substring(1, data.length - 1);
    } else if (!data) {
        data = '';
    } else if(typeof data === 'object') {
        data = JSON.stringify(data);
    } else {
        data = '{}';
    }


    var payload = {
        action: 'send_data',
        category: category,
        id: id,
        data: data
    };

    this._sendPayload(payload, requestId);
};

/**
 * Issues a "get sys info" command to the gateway via the mqtt broker.
 *
 * @class Commander
 * @method sysInfo
 * @param {String} gatewayname The name of the current gateway.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.sysInfo = function(gatewayname) {
    if(typeof gatewayname !== 'string' || gatewayname.length <= 0) {
        throw new Error('Invalid gateway name specified (arg #1)');
    }
    var connectorId = 'cnc-gateway-' + gatewayname;
    this.sendDataToConnector('device', connectorId, { command: 'system_info' });
};

/**
 * Issues a "reset agent" command, that places the agent in provisioning mode.
 *
 * @class Commander
 * @method resetAgent
 * @param {String} gatewayname The name of the current gateway.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.resetAgent = function(gatewayname) {
    if(typeof gatewayname !== 'string' || gatewayname.length <= 0) {
        throw new Error('Invalid gateway name specified (arg #1)');
    }
    var connectorId = 'cnc-gateway-' + gatewayname;
    this.sendDataToConnector('device', connectorId, { command: 'reset_agent' });
};

/**
 * Updates the configuration for a specific connector via the mqtt broker.
 *
 * @class Commander
 * @method updateConnectorConfig
 * @param {String} category The category of the connector to restart.
 * @param {String} id The id of the connector to restart.
 * @param {String} config A JSON payload that represents the connector
 *          configuration
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.updateConnectorConfig = function(category, id, config, requestId) {
    if (category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    if (typeof id !== 'string' || id.length <= 0) {
        throw new Error(_util.format('Invalid id specified: [%s]', id))
    }
    if(typeof config === 'string') {
        try {
            config = config.substring(1, config.length - 1);
            config = JSON.parse(config);
        } catch(ex) {
            throw new Error(_util.format('Error parsing configuration: [%s]', ex));
        }
    } else if(!config || typeof config !== 'object') {
        throw new Error('Invalid config specified - must be string or object (arg #3)');
    }

    var payload = {
        action: 'update_config',
        category: category,
        id: id,
        config: config
    };

    this._sendPayload(payload, requestId);
};

/**
 * Deletes the configuration for a specific connector via the mqtt broker.
 *
 * @class Commander
 * @method deleteConnectorConfig
 * @param {String} category The category of the connector to restart.
 * @param {String} id The id of the connector to restart.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.deleteConnectorConfig = function(category, id, requestId) {
    if (category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    if (typeof id !== 'string' || id.length <= 0) {
        throw new Error(_util.format('Invalid id specified: [%s]', id))
    }

    var payload = {
        action: 'delete_config',
        category: category,
        id: id
    };

    this._sendPayload(payload, requestId);
};

/**
 * Updates a connector type definition.
 *
 * @class Commander
 * @method updateConnectorType
 * @param {String} type The connector type name.
 * @param {String} modulePath Path to the connector module.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.updateConnectorType = function(type, modulePath, requestId) {
    if (typeof type !== 'string' || type.length <= 0) {
        throw new Error(_util.format('Invalid type specified: [%s]', type))
    }
    if (typeof modulePath !== 'string' || modulePath.length <= 0) {
        throw new Error(_util.format('Invalid module path specified: [%s]', modulePath))
    }

    var payload = {
        action: 'update_connector_type',
        type: type,
        modulePath: modulePath
    };

    this._sendPayload(payload, requestId);
};

/**
 * Issues a program terminate command to the gateway via the mqtt broker.
 *
 * @class Commander
 * @method terminateAgent
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.terminateAgent = function(requestId) {
    var payload = {
        action: 'maintenance_action',
        command: 'shutdown_program'
    };

    this._sendPayload(payload, requestId);
};

/**
 * Issues a program upgrade command to the gateway via the mqtt broker.
 *
 * @class Commander
 * @method upgradeAgent
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.upgradeAgent = function(requestId) {
    var payload = {
        action: 'maintenance_action',
        command: 'upgrade_program'
    };

    this._sendPayload(payload, requestId);
};


/**
 * Issues a reboot command to the gateway via the mqtt broker.
 *
 * @class Commander
 * @method rebootGateway
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.rebootGateway = function(requestId) {
    var payload = {
        action: 'maintenance_action',
        command: 'reboot_gateway'
    };

    this._sendPayload(payload, requestId);
};

/**
 * Sends a series of commands to the gateway, initializing it with a connection
 * to the cloud.
 *
 * @class Commander
 * @method initAgent
 * @param {Object} options An options object that contains provisioning parameters
 *          for the gateway.
 * @param {String} [requestId] An optional request id.
 */
Commander.prototype.initAgent = function(options, requestId) {
    if(!options || typeof options !== 'object') {
        throw new Error('Invalid provisioning options specified (arg #1)');
    }
    if(typeof options.host !== 'string' || options.host.length <= 0) {
        throw new Error('Options does not define a valid host (options.host)');
    }
    if(typeof options.currentGatewayName !== 'string' || options.currentGatewayName.length <= 0) {
        throw new Error('Options does not define a valid current gateway name (options.currentGatewayName)');
    }
    if(typeof options.newGatewayName !== 'string' || options.newGatewayName.length <= 0) {
        throw new Error('Options does not define a valid new gateway name (options.newGatewayName)');
    }
    if(typeof options.username !== 'string' || options.username.length <= 0) {
        throw new Error('Options does not define a valid user name (options.username)');
    }
    if(typeof options.password !== 'string' || options.password.length <= 0) {
        throw new Error('Options does not define a valid password (options.password)');
    }
    options.port = options.port || '8443';
    options.protocol = options.protocol || 'mqtts';
    options.networkInterface = options.networkInterface || 'eth0';

    var payload = [ {
        // New cnc cloud connector.
        action: 'update_config',
        category: 'cloud',
        id: 'cnc-cloud-' +  options.newGatewayName,
        config: {
            type: 'CncCloud',
            config: {
                host: options.host,
                port: options.port,
                protocol: options.protocol,
                networkInterface: options.networkInterface,
                gatewayname: options.newGatewayName,
                username: options.username,
                password: options.password,
                topics: ''
            }
        }
    }, {
        // New cnc gateway connector.
        action: 'update_config',
        category: 'device',
        id: 'cnc-gateway-' +  options.newGatewayName,
        config: {
            type: 'CncGateway',
            config: { }
        }
    }, {
        // Disable local network on reboot.
        action: 'send_data',
        category: 'device',
        id: 'cnc-gateway-' + options.currentGatewayName,
        data: JSON.stringify({ command: 'disable_local_network' })
    }, {
        // Delete old cnc cloud connector
        action: 'delete_config',
        category: 'cloud',
        id: 'cnc-cloud-' + options.currentGatewayName
    }, {
        // Delete old cnc gateway connector
        action: 'delete_config',
        category: 'device',
        id: 'cnc-gateway-' + options.currentGatewayName
    } ];

    if(typeof options.apiKey === 'string' && options.apiKey.length > 0) {
        payload.push({
            action: 'update_config',
            category: 'cloud',
            id: 'http',
            config: {
                type: 'Http',
                config: {
                    pollFrequency: 10000,
                    url: 'https://' + options.host,
                    headers: {
                        apiKey: options.apiKey,
                        'content-type': 'application/json'
                    }
                }
            }
        });
    }

    this._sendPayload(payload, requestId);
};

module.exports = Commander;
