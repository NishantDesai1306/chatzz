var _ = require('lodash');
var Q = require('q');

var ChatUserMethods = require('../ChatUser');
var ChatRoomMethods = require('../ChatRoom');

module.exports = function(socket, socketConnections, data) {
    //userId = chatUserId where as userToAdd is id of User collection
    var user1 = socketConnections.socketToUserMap[socket.id];
    var user2 = data.userToAdd;

    Q.all([
            ChatUserMethods.getChatUser(user1),
            ChatUserMethods.getChatUser(user2),
        ])
        .spread(function(chatUser1, chatUser2) {
            return ChatRoomMethods.createChatRoom(chatUser1._id, chatUser2._id);
        })
        .then(function(chatRoom) {
            var allSockets = socketConnections.IO.sockets.sockets;

            _.forEach(chatRoom.chatUsers, function(chatUser) {
                var userId = chatUser.user._id || chatUser.user;
                var socketIds = socketConnections.userToSocketMap[userId];

                if (socketIds && socketIds.length) {
                    var socketId = socketIds[0];
                    allSockets[socketId].join(chatRoom._id.toString());
                }
            });

        })
        .catch(function(err) {
            console.log(err);
        });
}