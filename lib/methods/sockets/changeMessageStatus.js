var _ = require('lodash');
var Q = require('q');

var ChatUserMethods = require('../ChatUser');
var ChatRoomMethods = require('../ChatRoom');
var ChatMessageMethods = require('../ChatMessage');
var registerSocket = require('./register');

module.exports = function(socketConnections, data) {
    var messageId = data.messageId;
    var newStatus = data.newStatus;

    return ChatMessageMethods.setStatus(messageId, newStatus)
        .then(function() {
            return ChatMessageMethods.getMessage(messageId)
        })
        .then(function(messageObj) {
            var chatRoomId = messageObj.chatRoom._id.toString();
            socketConnections.IO.sockets.in(chatRoomId).emit('chatzz', {
                type: 'message-status-changed',
                data: {
                    message: messageObj
                }
            });
        })
        .catch(function(err) {
            console.log(err);
        });
};