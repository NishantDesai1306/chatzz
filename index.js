var mongoose = require('mongoose');
var Q = require('q');
var _ = require('lodash');

var ChatUserMethods = require('./lib/methods/ChatUser');
var ChatMessageMethods = require('./lib/methods/ChatMessage');
var ChatRoomMethods = require('./lib/methods/ChatRoom');
var ChatzzMethods = require('./lib/methods/Chatzz');

var isInitialized = false;

var init = function(httpServer, chatUserModelName, userModelName, chatMessageModelName) {

    if (isInitialized) {
        return;
    }

    if (mongoose.connection.readyState !== 1) {
        return console.log('valid mongoose instance is required by chatzz');
    }

    ChatzzMethods.initChatzz(httpServer);
    ChatUserMethods.initModel(chatUserModelName, userModelName);
    ChatRoomMethods.initModel();
    ChatMessageMethods.initModel(chatUserModelName);

    isInitialized = true;
};

var getMethodsToExport = function() {
    var methodsToExport = {
        init: init
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