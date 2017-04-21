var _ = require('lodash');
var Q = require('q');

var ChatUserMethods = require('../ChatUser');
var ChatRoomMethods = require('../ChatRoom');
var registerSocket = require('./register');

module.exports = function(socket, socketConnections, data) {
    ChatUserMethods.getChatUser(data.userId)
        .then(function(chatUser) {
            return chatUser;
        })
        .catch(function(err) {
            return ChatUserMethods.addUser(data.userId);
        })
        .then(function(chatUserObj) { //change status to online
            return ChatUserMethods.setStatusOnline(chatUserObj.user || chatUserObj);
        })
        .then(function(chatUserObj) { //broadcast to other chat users 
            registerSocket(socket, socketConnections, data.userId);

            var connectedUsersMap = {};
            ChatRoomMethods.getChatRooms(chatUserObj._id)
                .then(function(chatRooms) {
                    _.forEach(chatRooms, function(chatRoom) {

                        _.forEach(chatRoom.chatUsers, function(chatUser) {
                            connectedUsersMap[chatUser.user._id.toString()] = Object.assign({},
                                chatUser.user.toObject(), { status: chatUser.status }
                            );
                        });

                        socket.join(chatRoom._id.toString());
                        socket.to(chatRoom._id.toString()).emit('chatzz', {
                            type: 'chat-user-status-changed',
                            data: {
                                user: chatUserObj.user,
                                status: chatUserObj.status
                            }
                        });
                    });

                    delete connectedUsersMap[chatUserObj.user._id];

                    return connectedUsersMap;
                })
                .then(function(connectedUsersMap) {
                    var chatUserPlainObj = chatUserObj.toObject();
                    chatUserPlainObj.connectedUsers = [];

                    _.forEach(connectedUsersMap, function(value) {
                        chatUserPlainObj.connectedUsers.push(value);
                    });

                    socket.emit('chatzz', { type: 'user-details', data: chatUserPlainObj });
                });

        })
        .catch(function(err) {
            console.log('Error while connecting user', err);
        });
}