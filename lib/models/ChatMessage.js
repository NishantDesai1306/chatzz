var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Q = require('q');
var _ = require('lodash');
var deepPopulate = require('mongoose-deep-populate')(mongoose);

var ChatUserModelName = require('./ChatUser').modelName;
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

                    return messageObj
                        .deepPopulate('from.user to.user')
                        .then(function() {
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

                model.findOne({
                        _id: messageId
                    })
                    .populate('from')
                    .populate('to')
                    .populate('chatRoom')
                    .exec(function(err, message) {
                        if (err) {
                            return defer.reject(err);
                        }

                        if (!message) {
                            return defer.reject(new Error('no record found for message ' + messageId));
                        }

                        message
                            .deepPopulate('from.user to.user')
                            .then(function() {
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

                if (filter.fromDate) {
                    criteria.createdAt = {
                        $gte: filter.fromDate
                    };
                }

                model.find(criteria)
                    .populate('from')
                    .populate('to')
                    .exec(function(err, messages) {
                        if (err) {
                            return defer.reject(err);
                        }

                        chatMessageModel.deepPopulate(messages, 'from.user to.user')
                            .then(function() {
                                return defer.resolve(messages);
                            })
                            .catch(function(err) {
                                return defer.reject(err);
                            });
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

        ChatMessageSchema.plugin(deepPopulate);
        chatMessageModel = mongoose.model(actualModelName, ChatMessageSchema);
    }
};

exports.modelName = function() {
    return actualModelName;
};

exports.model = function() {
    return chatMessageModel;
};