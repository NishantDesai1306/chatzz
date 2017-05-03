var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Q = require('q');
var _ = require('lodash');

var ChatUser = require('./ChatUser');
var ChatUserModelName = ChatUser.modelName;

var ChatRoomModelName = require('./ChatRoom').modelName;

var DEFAULT_CHATMESSAGE_MODEL_NAME = 'ChatMessage';
var chatMessageModel = null;
var actualModelName = null;

var MESSAGE_STATUS_SENT = 'sent';
var MESSAGE_STATUS_READ = 'read';
var MESSAGE_STATUS_NOT_SENT = 'not_sent';

exports.initModel = function(modelName) {
    if (!chatMessageModel) {
        actualModelName = modelName || DEFAULT_CHATMESSAGE_MODEL_NAME;

        var ChatMessageSchema = new Schema({
            message: {
                type: String,
                require: true
            },
            chatRoom: {
                type: Schema.Types.ObjectId,
                ref: ChatRoomModelName(),
                required: true,
            },
            from: {
                type: Schema.Types.ObjectId,
                ref: ChatUserModelName(),
                required: true
            },
            to: {
                type: Schema.Types.ObjectId,
                ref: ChatUserModelName(),
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            status: {
                type: String,
                enum: [
                    MESSAGE_STATUS_NOT_SENT,
                    MESSAGE_STATUS_SENT,
                    MESSAGE_STATUS_READ
                ],
                default: MESSAGE_STATUS_NOT_SENT
            },
            readAt: Date
        });

        ChatMessageSchema.statics = {
            MESSAGE_STATUS_NOT_SENT: MESSAGE_STATUS_NOT_SENT,
            MESSAGE_STATUS_READ: MESSAGE_STATUS_READ,
            MESSAGE_STATUS_SENT: MESSAGE_STATUS_SENT,

            createMessage: function(chatRoomId, fromChatUserId, toChatUserId, message) {
                var defer = Q.defer();
                var model = this;
                var ChatUserModel = ChatUser.model();

                var messageObj = new model({
                    message: message,
                    chatRoom: chatRoomId,
                    from: fromChatUserId,
                    to: toChatUserId
                });

                messageObj.save(function(err) {
                    if (err) {
                        return defer.reject(err);
                    }

                    Q.all([
                            ChatUserModel.getChatUser(fromChatUserId),
                            ChatUserModel.getChatUser(toChatUserId),
                        ])
                        .spread(function(populatedFromChatUserObj, populatedToChatUserObj) {
                            messageObj.from = populatedFromChatUserObj;
                            messageObj.to = populatedToChatUserObj;
                            return defer.resolve(messageObj);
                        })
                        .catch(function(err) {
                            return defer.reject(err);
                        });
                });

                return defer.promise;
            },
            getUserMessages: function(userId) {
                var defer = Q.defer();
                var model = this;

                model.find({
                        $or: [
                            { from: userId },
                            { to: userId }
                        ]
                    })
                    .populate('from')
                    .populate('to')
                    .exec(function(err, messages) {
                        if (err) {
                            return defer.reject(err);
                        }

                        return defer.resolve(messages);
                    });


                return defer.promise;
            },
            getMessage: function(messageId) {
                var defer = Q.defer();
                var model = this;
                var ChatUserModel = ChatUser.model();

                model.findOne({
                        _id: messageId
                    })
                    .populate('chatRoom')
                    .exec(function(err, message) {
                        if (err) {
                            return defer.reject(err);
                        }

                        if (!message) {
                            return defer.reject(new Error('no record found for message ' + messageId));
                        }

                        Q.all([
                                ChatUserModel.getChatUser(message.from),
                                ChatUserModel.getChatUser(message.to),
                            ])
                            .spread(function(populatedFromChatUserObj, populatedToChatUserObj) {
                                message.from = populatedFromChatUserObj;
                                message.to = populatedToChatUserObj;
                                return defer.resolve(message);
                            })
                            .catch(function(err) {
                                return defer.reject(err);
                            });
                    });

                return defer.promise;
            },
            getMessagesFromChatRoom: function(chatRoomId, filter) {
                var defer = Q.defer();
                var model = this;
                var criteria = {
                    chatRoom: chatRoomId
                };
                var ChatUserModel = ChatUser.model();

                if (filter.fromDate) {
                    criteria.createdAt = {
                        $gte: filter.fromDate
                    };
                }

                model.find(criteria)
                    .exec(function(err, messages) {
                        if (err) {
                            return defer.reject(err);
                        }

                        messages.reduce(function(p, message) {
                                var nextIteration = Q.defer();
                                p.then(function() {

                                    Q.all([
                                            ChatUserModel.getChatUser(message.from),
                                            ChatUserModel.getChatUser(message.to)
                                        ])
                                        .spread(function(populatedFromChatUserObj, populatedToChatUserObj) {
                                            message.from = populatedFromChatUserObj;
                                            message.to = populatedToChatUserObj;
                                            return nextIteration.resolve(message);
                                        })
                                        .catch(function(err) {
                                            console.log(err);
                                            return nextIteration.reject(err);
                                        });
                                });

                                return nextIteration.promise;
                            }, Q.when())
                            .then(function() {
                                return defer.resolve(messages);
                            })
                            .catch(function(err) {
                                return defer.reject(err);
                            });
                    });

                return defer.promise;
            },
            getMissedMessages: function(chatRoomId, chatUserId) {
                var defer = Q.defer();
                var model = this;

                model.find({
                    chatRoom: chatRoomId,
                    to: chatUserId,
                    status: MESSAGE_STATUS_NOT_SENT
                }, function(err, messages) {
                    if (err) {
                        return defer.reject(err);
                    }

                    Q.all(
                            messages.map(function(message) {
                                return model.getMessage(message._id.toString());
                            })
                        )
                        .then(function(messages) {
                            return defer.resolve(messages);
                        })
                        .catch(function(err) {
                            return defer.reject(err);
                        });
                });

                return defer.promise;
            },
            markMessagesSent: function(messageIds) {
                var defer = Q.defer();
                var model = this;

                model.update({
                    status: MESSAGE_STATUS_NOT_SENT
                }, {
                    status: MESSAGE_STATUS_SENT
                }, {
                    multi: true
                }, function(err) {
                    if (err) {
                        return defer.reject(err);
                    }

                    return defer.resolve();
                });

                return defer.promise;
            }
        };

        ChatMessageSchema.methods = {
            setStatus: function(newStatus) {
                var defer = Q.defer();
                var messageModel = this;

                messageModel.status = newStatus;
                // console.log(messageModel);
                messageModel.save(function(err) {
                    if (err) {
                        return defer.reject(err);
                    }

                    return defer.resolve(messageModel);
                });

                return defer.promise;
            },
            markRead: function() {
                this.readAt = new Date();
                return this.setStatus(MESSAGE_STATUS_READ);
            },
            markSent: function() {
                return this.setStatus(MESSAGE_STATUS_SENT);
            }
        };

        chatMessageModel = mongoose.model(actualModelName, ChatMessageSchema);
    }
};

exports.modelName = function() {
    return actualModelName;
};

exports.model = function() {
    return chatMessageModel;
};