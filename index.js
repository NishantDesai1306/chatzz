var mongoose = require('mongoose');
var Q = require('q');
var _ = require('lodash');

var ChatUserMethods = require('./lib/methods/ChatUser');
var ChatMessageMethods = require('./lib/methods/ChatMessage');
var ChatRoomMethods = require('./lib/methods/ChatRoom');
var ChatzzMethods = require('./lib/methods/Chatzz');

var isInitialized = false;
var chatzzConfig = null;

var init = function(httpServer, config) {

    if (isInitialized) {
        return;
    }

    if (mongoose.connection.readyState !== 1) {
        return console.log('valid mongoose instance is required by chatzz');
    }

    chatzConfig = config || {};

    ChatzzMethods.initChatzz(httpServer);
    ChatUserMethods.initModel(config.chatUserModelName, config.userModelName);
    ChatRoomMethods.initModel();
    ChatMessageMethods.initModel(config.chatUserModelName);

    isInitialized = true;
};

var getChatzzConfig = function() {
    return chatzzConfig;
};

var getMethodsToExport = function() {
    var methodsToExport = {
        init: init,
        getChatzzConfig: getChatzzConfig
    };
    var ignoreExports = ['initChatzz'];

    _.forEach([ChatUserMethods, ChatMessageMethods], function(methodCollection) {
        _.forEach(methodCollection, function(key, value) {
            if (ignoreExports.indexOf(key) > -1) {
                return;
            }

            if (methodsToExport[key]) {
                console.log(key, 'already exists');
            }
            methodsToExport[key] = value;
        });
    });

    return methodsToExport;
};

module.exports = getMethodsToExport();