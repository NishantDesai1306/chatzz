var Q = require('q');

var ChatRoom = require('../models/ChatRoom');

exports.createChatRoom = function(chatUser1, chatUser2) {
    if (!chatUser1 || !chatUser2) {
        return Q.reject('chatUser1 ' + chatUser1 + ' or chatUser2 ' + chatUser2 + ' is invalid');
    }

    var ChatRoomModel = ChatRoom.model();
    return ChatRoomModel.createChatRoom(chatUser1, chatUser2)
        .then(function(chatRoom) {
            return ChatRoomModel.getChatRoomById(chatRoom._id);
        });
};

exports.getChatRooms = function(chatUserId) {
    if (!chatUserId) {
        return Q.reject('null chatUserId passed');
    }

    var ChatRoomModel = ChatRoom.model();
    return ChatRoomModel.getChatRooms(chatUserId);
};

var getChatRoomById = function(chatRoomId) {
    if (!chatRoomId) {
        return Q.reject('null chatRoomId passed');
    }

    var ChatRoomModel = ChatRoom.model();
    return ChatRoomModel.getChatRoomById(chatRoomId)
};
exports.getChatRoomById = getChatRoomById;

exports.getChatRoomFromUsers = function(chatUsers) {
    if (!chatUsers || chatUsers.length < 2) {
        return Q.reject('invalid list of chatUsers passed' + chatUsers);
    }

    var ChatRoomModel = ChatRoom.model();
    return ChatRoomModel.getChatRoomsFromUsers(chatUsers);
};

exports.initModel = function(modelName) {
    ChatRoom.initModel(modelName);
};