var _ = require('lodash');
var Q = require('q');

var ChatUserMethods = require('../ChatUser');
var ChatRoomMethods = require('../ChatRoom');
var ChatMessageMethods = require('../ChatMessage');
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
                    var defer = Q.defer();
                    var missedMessages = {};

                    chatRooms.reduce(function(p, chatRoom) {
                            var nextIteration = Q.defer();

                            p.then(function() {

                                ChatMessageMethods.getMissedMessagesFromChatRoom(chatRoom._id.toString(), chatUserObj._id.toString())
                                    .then(function(messages) {
                                        var processedMessagesDefer = Q.defer();

                                        if (messages && messages.length) {
                                            var messageIds = messages.map(function(message) {
                                                return message._id.toString()
                                            });

                                            missedMessages[chatRoom._id.toString()] = messages;
                                            ChatMessageMethods.markMessagesSent(messageIds)
                                                .then(function() {
                                                    return Q.all(
                                                        messageIds.map(function(messageId) {
                                                            return ChatMessageMethods.getMessage(messageId);
                                                        })
                                                    );
                                                })
                                                .then(function(messageObjs) {
                                                    _.forEach(messageObjs, function(messageObj) {
                                                        var allSockets = socketConnections.IO.sockets.sockets;
                                                        var senderSockets = socketConnections.userToSocketMap[messageObj.from.user._id.toString()];

                                                        _.forEach(senderSockets, function(senderSocket) {
                                                            allSockets[senderSocket].emit('chatzz', {
                                                                type: 'message-status-changed',
                                                                data: {
                                                                    message: messageObj
                                                                }
                                                            });
                                                        });
                                                    });

                                                    return processedMessagesDefer.resolve();
                                                })
                                                .catch(function(err) {
                                                    return nextIteration.reject(err);
                                                });
                                        } else {
                                            processedMessagesDefer.resolve();
                                        }

                                        processedMessagesDefer.promise
                                            .then(function() {
                                                _.forEach(chatRoom.chatUsers, function(chatUser) {
                                                    connectedUsersMap[chatUser.user._id.toString()] = Object.assign({},
                                                        chatUser.user.toObject(), {
                                                            chatRoom: chatRoom._id,
                                                            status: chatUser.status,
                                                            lastOnline: chatUser.lastOnline
                                                        }
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

                                                nextIteration.resolve();
                                            });
                                    })
                                    .catch(function(err) {
                                        return nextIteration.reject(err);
                                    });
                            });

                            return nextIteration.promise;
                        }, Q.when())
                        .then(function() {
                            delete connectedUsersMap[chatUserObj.user._id];

                            defer.resolve({
                                connectedUsersMap: connectedUsersMap,
                                missedMessages: missedMessages
                            });
                        })
                        .catch(function(err) {
                            return defer.reject(err);
                        });

                    return defer.promise;
                })
                .then(function(data) {
                    var connectedUsersMap = data.connectedUsersMap;
                    var chatUserPlainObj = chatUserObj.toObject();

                    chatUserPlainObj.connectedUsers = [];
                    _.forEach(connectedUsersMap, function(value) {
                        chatUserPlainObj.connectedUsers.push(value);
                    });

                    chatUserPlainObj.missedMessages = data.missedMessages;

                    socket.emit('chatzz', { type: 'user-details', data: chatUserPlainObj });
                });

        })
        .catch(function(err) {
            console.log('Error while connecting user', err);
        });
}