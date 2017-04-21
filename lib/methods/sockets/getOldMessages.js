var Q = require('q');
var _ = require('lodash');
var moment = require('moment');

var ChatRoomMethods = require('../ChatRoom');
var ChatUserMethods = require('../ChatUser');
var ChatMessageMethods = require('../ChatMessage');

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
            personalChatRoom = chatRoom;

            var chatRoom = _.find(chatRooms, function(chatRoom) {
                return chatRoom.chatUsers.length === 2;
            });

            return chatRoom;
        })
        .then(function(personalChatRoom) {
            return ChatMessageMethods.getMessagesFromChatRoom(personalChatRoom._id || personalChatRoom, {
                fromDate: fromDate
            });
        })
        .then(function(messages) {
            return Q.all(
                    messages.map(function(message) {
                        return message.status === ChatMessageMethods.getMessageNotSentStatus() ? message.markSent() : Q.when();
                    })
                )
                .then(function() {
                    return socket.emit('chatzz', { type: 'old-messages', data: messages });
                });
        })
        .catch(function(err) {
            console.log('err', err);
        });
};