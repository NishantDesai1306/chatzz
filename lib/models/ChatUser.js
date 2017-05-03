var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Q = require('q');
var _ = require('lodash');

var DEFAULT_CHATUSER_MODEL_NAME = 'ChatUser';
var DEFAULT_USER_MODEL_NAME = 'User';
var actualModelName = null;
var chatUserModel = null;

var STATUS_ONLINE = 'online';
var STATUS_OFFLINE = 'offline';
var noop = function(arg) {
    return Q.when(arg);
};

exports.initModel = function(modelName, userModelName) {
    if (!chatUserModel) {
        actualModelName = modelName || DEFAULT_CHATUSER_MODEL_NAME;
        userModelName = userModelName || DEFAULT_USER_MODEL_NAME;

        var ChatMessageModel = require('./ChatMessage').model();

        var ChatUserSchema = new Schema({
            user: {
                type: Schema.Types.ObjectId,
                ref: userModelName,
                required: true,
                unique: true
            },
            status: {
                type: String,
                enum: [STATUS_ONLINE, STATUS_OFFLINE]
            },
            lastOnline: Date
        });

        ChatUserSchema.statics = {
            USER_STATUS_ONLINE: STATUS_ONLINE,
            USER_STATUS_OFFLINE: STATUS_OFFLINE,
            getChatUser: function(user) {
                var defer = Q.defer();
                var model = this;
                var beforeSendingUserDetails = require('../../').getChatzzConfig().beforeSendingUserDetails || noop;

                model.findOne({
                        $or: [
                            { user: user },
                            { _id: user }
                        ]
                    })
                    .exec(function(err, chatUser) {
                        if (err) {
                            return defer.reject(err);
                        }

                        if (!chatUser) {
                            return defer.reject(new Error('no record found for user ' + user));
                        }

                        beforeSendingUserDetails(chatUser.user)
                            .then(function(populatedUserObj) {
                                chatUser.user = populatedUserObj;
                                return defer.resolve(chatUser);
                            })
                            .catch(function(err) {
                                return defer.reject(err);
                            });
                    });

                return defer.promise;
            },
            createChatUser: function(newUser) {
                var defer = Q.defer();
                var model = this;

                var newUserModel = new model({
                    user: newUser
                });

                newUserModel.save(function(err) {
                    if (err) {
                        return defer.reject(err);
                    }

                    return defer.resolve(newUserModel);
                });

                return defer.promise;
            },
            addChatUser: function(addToUser, addChatUserObj) {
                var defer = Q.defer();
                var model = this;

                model.getChatUser(addToUser)
                    .then(function(userObj) {

                        userObj.addChatUser(addChatUserObj)
                            .then(function(returnedUserObj) {
                                defer.resolve(returnedUserObj);
                            })
                            .catch(function(err) {
                                defer.reject(err);
                            });
                    });

                return defer.promise;
            },
            getMessage: function(user) {
                var defer = Q.defer();
                var model = this;

                model.getChatUser(user)
                    .then(function(chatUser) {
                        return chatUser.getMessages();
                    })
                    .then(function(messages) {
                        defer.resolve(messages);
                    })
                    .catch(function(err) {
                        defer.reject(err);
                    });

                return defer.promise;
            },
            setUserStatus: function(user, status) {
                var defer = Q.defer();
                var model = this;

                model.getChatUser(user)
                    .then(function(user) {
                        return user.setStatus(status);
                    })
                    .then(function(user) {
                        return defer.resolve(user);
                    })
                    .catch(function(err) {
                        return defer.reject(err);
                    });

                return defer.promise;
            }
        };

        ChatUserSchema.methods = {
            getMessages: function() {
                var defer = Q.defer();
                var userModel = this;

                ChatMessageModel.getUserMessages(userModel.user._id || userModel._id);

                return defer.promise;
            },
            setStatus: function(status) {
                var defer = Q.defer();
                var userModel = this;

                if (status === STATUS_OFFLINE) {
                    userModel.lastOnline = new Date();
                }

                userModel.status = status;
                userModel.save(function(err) {
                    if (err) {
                        return defer.reject(err);
                    }

                    return defer.resolve(userModel);
                });

                return defer.promise;
            }
        };

        chatUserModel = mongoose.model(actualModelName, ChatUserSchema);
    }
};

exports.modelName = function() {
    return actualModelName;
};

exports.model = function() {
    return chatUserModel;
};