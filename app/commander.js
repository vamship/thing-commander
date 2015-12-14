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
    requestId = requestId || this._getNextRequestId();
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

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
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
    requestId = requestId || this._getNextRequestId();
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

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
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
    requestId = requestId || this._getNextRequestId();
    if(category !== undefined && category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    var payload = {
        category: category,
        action: 'list_connectors'
    };

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
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
    requestId = requestId || this._getNextRequestId();
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

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
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
    requestId = requestId || this._getNextRequestId();
    if (category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    if (typeof id !== 'string' || id.length <= 0) {
        throw new Error(_util.format('Invalid id specified: [%s]', id))
    }

    var payload = {
        action: 'send_data',
        category: category,
        id: id,
        data: data
    };

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
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
    requestId = requestId || this._getNextRequestId();
    if (category !== 'cloud' && category !== 'device') {
        throw new Error(_util.format('Invalid category specified: [%s]', category))
    }
    if (typeof id !== 'string' || id.length <= 0) {
        throw new Error(_util.format('Invalid id specified: [%s]', id))
    }
    try {
        config = config.substring(1, config.length - 1);
        console.log(config);
        config = JSON.parse(config);
    } catch(ex) {
        throw new Error(_util.format('Error parsing configuration: [%s]', ex));
    }

    var payload = {
        action: 'update_config',
        category: category,
        id: id,
        config: config
    };

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
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
    requestId = requestId || this._getNextRequestId();
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

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
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
    requestId = requestId || this._getNextRequestId();
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

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
};

/**
 * Issues a program shutdown command to the gateway via the mqtt broker.
 *
 * @class Commander
 * @method shutdownGateway
 */
Commander.prototype.shutdownGateway = function(requestId) {
    requestId = requestId || this._getNextRequestId();

    var payload = {
        action: 'shutdown_program'
    };

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
};

/**
 * Issues a program upgrade command to the gateway via the mqtt broker.
 *
 * @class Commander
 * @method upgradeGateway
 */
Commander.prototype.upgradeGateway = function(requestId) {
    requestId = requestId || this._getNextRequestId();

    var payload = {
        action: 'upgrade_program'
    };

    var topic = this._topicPrefix + requestId;
    this._client.publish(topic, JSON.stringify(payload));
};


module.exports = Commander;
