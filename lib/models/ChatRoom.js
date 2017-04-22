var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Q = require('q');
var _ = require('lodash');
var deepPopulate = require('mongoose-deep-populate')(mongoose);

var ChatUserModelName = require('./ChatUser').modelName;

var DEFAULT_CHATROOM_MODEL_NAME = 'ChatRoom';
var chatRoomModel = null;
var actualModelName = null;

exports.initModel = function(modelName) {
    if (!chatRoomModel) {
        actualModelName = modelName || DEFAULT_CHATROOM_MODEL_NAME;

        var ChatRoomSchema = new Schema({
            chatUsers: [{
                type: Schema.Types.ObjectId,
                ref: ChatUserModelName(),
                required: true
            }],
            createdAt: {
                type: Date,
                default: Date.now
            }
        });

        ChatRoomSchema.statics = {
            createChatRoom: function(chatUser1, chatUser2) {
                var defer = Q.defer();
                var model = this;

                var chatRoom = new model({
                    chatUsers: [chatUser1, chatUser2]
                });

                chatRoom.save(function(err) {
                    if (err) {
                        return defer.reject(err);
                    }

                    return defer.resolve(chatRoom);
                });

                return defer.promise;
            },
            getChatRoomById: function(chatRoomId) {
                var defer = Q.defer();
                var model = this;

                model.findOne({
                        _id: chatRoomId
                    })
                    .populate('chatUsers')
                    .exec(function(err, chatRoom) {
                        if (err) {
                            return defer.reject(err);
                        }

                        if (!chatRoom) {
                            return defer.reject(new Error('invalid chatRoomId ' + chatRoomId + ' passed'));
                        }

                        chatRoom.deepPopulate('chatUsers.user')
                            .then(function() {
                                return defer.resolve(chatRoom);
                            })
                            .catch(function(err) {
                                return defer.reject(err);
                            });

                    });

                return defer.promise;
            },
            getChatRooms: function(chatUserId) {
                var defer = Q.defer();
                var model = this;

                model.find({
                        chatUsers: { $in: [chatUserId] }
                    })
                    .populate('chatUsers')
                    .exec(function(err, chatRooms) {
                        if (err) {
                            return defer.reject(err);
                        }

                        chatRoomModel.deepPopulate(chatRooms, 'chatUsers.user')
                            .then(function(populatedChatRooms) {
                                return defer.resolve(chatRooms);
                            });
                    });

                return defer.promise;
            },
            getChatRoomsFromUsers: function(chatUsers) {
                var defer = Q.defer();
                var model = this;

                model.find({
                    chatUsers: {
                        $all: chatUsers
                    }
                }, function(err, chatRooms) {
                    if (err) {
                        return defer.reject(err);
                    }

                    Q.all(chatRooms.map(function(chatRoom) {
                            return model.getChatRoomById(chatRoom._id.toString())
                        }))
                        .then(function(chatRooms) {
                            return defer.resolve(chatRooms);
                        })

                });

                return defer.promise;
            }
        };

        ChatRoomSchema.methods = {};

        ChatRoomSchema.plugin(deepPopulate);
        chatRoomModel = mongoose.model(actualModelName, ChatRoomSchema);
    }
};

exports.modelName = function() {
    return actualModelName;
};

exports.model = function() {
    return chatRoomModel;
};