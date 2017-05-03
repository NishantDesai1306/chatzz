var Q = require('q');
var _ = require('lodash');
var moment = require('moment');

var ChatRoomMethods = require('../ChatRoom');
var ChatUserMethods = require('../ChatUser');
var ChatMessageMethods = require('../ChatMessage');

module.exports = function(socket, socketConnections, data) {
    var companionUser = data.toUser;
    var requestingUser = socketConnections.socketToUserMap[socket.id];
    var message = data.message;

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
                //future idea for chat groups so length is added for check
                return chatRoom.chatUsers.length === 2;
            });

            if (!chatRoom) {
                return Q.reject('no chatroom found between ' + JSON.stringify(requestingChatUserObj.user) + 'and ', JSON.stringify(companionChatUserObj));
            }

            personalChatRoom = chatRoom;
            return personalChatRoom;
        })
        .then(function(chatRoom) {
            return ChatMessageMethods.createMessage(chatRoom._id, requestingChatUserObj._id, companionChatUserObj._id, message);
        })
        .then(function(messageObj) {
            var allSockets = socketConnections.IO.sockets.sockets;
            var sentUsersCount = 0;
            var requiredSockets = [];

            personalChatRoom.chatUsers.forEach(function(chatUser) {
                var userSockets = socketConnections.userToSocketMap[chatUser.user._id];
                if (userSockets && userSockets.length) {
                    sentUsersCount++;
                    userSockets.forEach(function(socketId) {
                        requiredSockets.push(socketId);
                        allSockets[socketId].emit('chatzz', { type: 'new-message', data: messageObj });
                    });
                }
            });

            if (sentUsersCount === personalChatRoom.chatUsers.length) {
                messageObj.markSent()
                    .then(function(updatedMessageObj) {
                        requiredSockets.forEach(function(socketId) {
                            allSockets[socketId].emit('chatzz', {
                                type: 'message-status-changed',
                                data: {
                                    message: updatedMessageObj
                                }
                            });
                        });
                    });
            }
        })
        .catch(function(err) {
            console.log(err);
        });
};