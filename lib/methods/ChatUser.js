var ChatUser = require('../models/ChatUser');
var Q = require('q');

exports.addUser = function(newUserId) {
    if (!newUserId) {
        return Q.reject(new Error('null userId passed'));
    }
    var ChatUserModel = ChatUser.model();
    return ChatUserModel.createChatUser(newUserId);
};

exports.getChatUser = function(user) {
    if (!user) {
        return Q.reject(new Error('null user passed'));
    }
    var ChatUserModel = ChatUser.model();
    return ChatUserModel.getChatUser(user);
};

exports.getChatMessages = function(newUserId) {
    if (!newUserId) {
        return Q.reject(new Error('null userId passed'));
    }
    var ChatUserModel = ChatUser.model();
    return ChatUserModel.getMessages(newUserId);
};

exports.setStatusOnline = function(user) {
    if (!user) {
        return Q.reject(new Error('null userId passed'));
    }

    var ChatUserModel = ChatUser.model();

    return ChatUserModel.setUserStatus(user, ChatUserModel.USER_STATUS_ONLINE);
};
exports.setStatusOffline = function(user) {
    if (!user) {
        return Q.reject(new Error('null userId passed'));
    }

    var defer = Q.defer();
    var ChatUserModel = ChatUser.model();

    return ChatUserModel.setUserStatus(user, ChatUserModel.USER_STATUS_OFFLINE);
};

exports.initModel = function(modelName) {
    ChatUser.initModel(modelName);
};