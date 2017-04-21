var Q = require('q');
var _ = require('lodash');
var moment = require('moment');

var ChatRoomMethods = require('../ChatRoom');
var ChatUserMethods = require('../ChatUser');
var ChatMessageMethods = require('../ChatMessage');

var informCompanionUser = function(companionUserId, messages, socketConnections) {
    var companionUserSocketIds = socketConnections.userToSocketMap[companionUserId];
    var allSockets = socketConnections.IO.sockets.sockets;

    messages.forEach(function(message) {
        if (message.from.user._id.toString() === companionUserId.toString()) {
            companionUserSocketIds.forEach(function(companionUserSocketId) {
                allSockets[companionUserSocketId].emit('chatzz', {
                    type: 'message-status-changed',
                    data: {
                        message: message
                    }
                });
            });
        }
    });
}

module.exports = function(socket, socketConnections, data) {
    var companionUser = data.userId;
    var requestingUser = socketConnections.socketToUserMap[socket.id];

    if (data.fromDate) {
        var fromDate = moment(data.fromDate).toDate();
    }

    var requestingChatUserObj, companionChatUserObj, personalChatRoom;

    Q.all([
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
            var companionUserId;
            var requestingUser = socketConnections.socketToUserMap[socket.id];

            for (var i = 0; i < personalChatRoom.chatUsers.length; i++) {
                if (personalChatRoom.chatUsers[i].user._id !== requestingUser) {
                    companionUserId = personalChatRoom.chatUsers[i].user._id;
                    break;
                }
            }

            ChatMessageMethods.markMessagesSent(messageIds)
                .then(function() {
                    return ChatMessageMethods.getMessagesFromChatRoom(personalChatRoom._id || personalChatRoom, {
                        fromDate: fromDate
                    });
                })
                .then(function(messages) {
                    informCompanionUser(companionUserId, messages, socketConnections);
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