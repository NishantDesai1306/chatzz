var Q = require('q');
var _ = require('lodash');
var moment = require('moment');

var ChatRoomMethods = require('../ChatRoom');
var ChatUserMethods = require('../ChatUser');
var ChatMessageMethods = require('../ChatMessage');

var informCompanionUser = function(requestingUserId, messages, socketConnections) {
    var allSockets = socketConnections.IO.sockets.sockets;

    messages.forEach(function(message) {
        var messageSenderId = message.from.user._id.toString();
        var isMessageMarkedSent = message.status === ChatMessageMethods.getMessageReadStatus();

        if (messageSenderId !== requestingUserId.toString() && !isMessageMarkedSent) {
            var companionUserSocketIds = socketConnections.userToSocketMap[messageSenderId];

            _.forEach(companionUserSocketIds, function(companionUserSocketId) {
                allSockets[companionUserSocketId].emit('chatzz', {
                    type: 'message-status-changed',
                    data: {
                        message: message
                    }
                });
            });
        }
    });
};

var getMessageFromPersonalChat = function(requestingUser, companionUser, socket, socketConnections, data) {

    if (data.fromDate) {
        var fromDate = moment(data.fromDate).toDate();
    }

    var requestingChatUserObj, companionChatUserObj, personalChatRoom;

    return Q.all([
            ChatUserMethods.getChatUser(requestingUser),
            ChatUserMethods.getChatUser(companionUser),
        ])
        .spread(function(requestingChatUser, companionChatUser) {
            requestingChatUserObj = requestingChatUser;
            companionChatUserObj = companionChatUser;

            return ChatRoomMethods.getChatRoomFromUsers([requestingChatUserObj._id, companionChatUserObj._id]);
        })
        .then(function(chatRooms) {

            var chatRoom = _.find(chatRooms, function(chatRoom) {
                return chatRoom.chatUsers.length === 2;
            });

            personalChatRoom = chatRoom;
            return personalChatRoom;
        })
        .then(function(personalChatRoom) {
            return ChatMessageMethods.getMessagesFromChatRoom(personalChatRoom._id || personalChatRoom, {
                    fromDate: fromDate
                })
                .then(function(messages) {
                    return messages.map(function(message) {
                        return message._id;
                    });
                });
        })
        .then(function(messageIds) {
            return ChatMessageMethods.markMessagesSent(messageIds)
                .then(function() {
                    return ChatMessageMethods.getMessagesFromChatRoom(personalChatRoom._id || personalChatRoom, {
                        fromDate: fromDate
                    });
                })
                .then(function(messages) {
                    informCompanionUser(requestingUser, messages, socketConnections);
                    return socket.emit('chatzz', { type: 'old-messages', data: messages });
                })
                .catch(function(err) {
                    console.log(err);
                });
        })
        .catch(function(err) {
            console.log('err', err);
        });
};

module.exports = function(socket, socketConnections, data) {
    var companionUser = data.userId;
    var requestingUser = socketConnections.socketToUserMap[socket.id];

    return getMessageFromPersonalChat(requestingUser, companionUser, socket, socketConnections, data);
};