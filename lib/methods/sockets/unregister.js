var _ = require('lodash');
var Q = require('q');

var ChatUserMethods = require('../ChatUser');
var ChatRoomMethods = require('../ChatRoom');

module.exports = function(socket, socketConnections) {
    var userId = socketConnections.socketToUserMap[socket.id];
    var userSockets = socketConnections.userToSocketMap[userId];
    var chatUserObj;

    if (!userSockets) {
        return;
    }

    var socketIndex = userSockets.indexOf(socket.id);
    userSockets.splice(socketIndex, 1);

    if (!userSockets.length) {
        ChatUserMethods.getChatUser(userId)
            .then(function(chatUser) {
                chatUserObj = chatUser;
                return ChatUserMethods.setStatusOffline(userId);
            })
            .then(function(chatUser) {
                chatUserObj = chatUser;
                return ChatRoomMethods.getChatRooms(chatUserObj._id);
            })
            .then(function(chatRooms) {
                return _.forEach(chatRooms, function(chatRoom) {
                    socket.to(chatRoom._id.toString()).emit('chatzz', {
                        type: 'chat-user-status-changed',
                        data: {
                            user: chatUserObj.user,
                            status: chatUserObj.status,
                            lastOnline: chatUserObj.lastOnline
                        }
                    });
                });
            })
            .then(function() {
                delete socketConnections.userToSocketMap[userId];
            })
            .catch(function(e) {
                console.log(e);
            });
    }

    delete socketConnections.socketToUserMap[socket.id];
};