var ChatMessage = require('../models/ChatMessage');
var Q = require('q');

exports.initModel = function(modelName) {
    ChatMessage.initModel(modelName);
};

var getMessage = function(messageId) {
    if (!messageId) {
        return Q.reject(new Error('null messageId passed'));
    }

    var chatMessageModel = ChatMessage.model();
    return chatMessageModel.getMessage(messageId);
};
exports.getMessage = getMessage;

var setStatus = function(messageId, newStatus) {
    if (!messageId) {
        return Q.reject('null messageId passed');
    }
    if (!newStatus) {
        return Q.reject(new Error('null newStatus passed'))
    }

    var chatMessageModel = ChatMessage.model();

    return getMessage(messageId)
        .then(function(messageObj) {
            switch (newStatus) {
                case chatMessageModel.MESSAGE_STATUS_READ:
                    {
                        return messageObj.setStatus(chatMessageModel.MESSAGE_STATUS_READ);
                    }
                case chatMessageModel.MESSAGE_STATUS_SENT:
                    {
                        return messageObj.setStatus(chatMessageModel.MESSAGE_STATUS_SENT);
                    }
                default:
                    return Q.reject(new Error('newStatus ' + newStatus + ' is not valid'));
            }
        });
};
exports.setStatus = setStatus;

exports.getMessagesFromChatRoom = function(chatRoomId, filter) {
    if (!chatRoomId) {
        return Q.reject('null chatRoomId passed');
    }

    var chatMessageModel = ChatMessage.model();
    return chatMessageModel.getMessagesFromChatRoom(chatRoomId, filter);
};

exports.createMessage = function(chatRoomId, fromChatUserId, toChatUserId, message) {
    if (!chatRoomId) {
        return Q.reject('null chatRoomId passed');
    }
    if (!fromChatUserId) {
        return Q.reject('null fromChatUserId chatUser passed');
    }
    if (!toChatUserId) {
        return Q.reject('null toChatUserId chatUser passed');
    }
    if (!message) {
        return Q.reject('null message passed');
    }

    var chatMessageModel = ChatMessage.model();
    return chatMessageModel.createMessage(chatRoomId, fromChatUserId, toChatUserId, message);
};

exports.markMessagesSent = function(messageIds) {
    var chatMessageModel = ChatMessage.model();
    return chatMessageModel.markMessagesSent(messageIds);
};

exports.getMessageReadStatus = function() {
    return ChatMessage.model().MESSAGE_STATUS_READ;
};
exports.getMessageSentStatus = function() {
    return ChatMessage.model().MESSAGE_STATUS_SENT;
};
exports.getMessageNotSentStatus = function() {
    return ChatMessage.model().MESSAGE_STATUS_NOT_SENT;
};