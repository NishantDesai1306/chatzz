var ioLib = require('socket.io');

var SocketMethods = require('./sockets');
var ChatMessageMethods = require('./ChatMessage');

var IO;
var socketConnections = {
    socketToUserMap: {},
    userToSocketMap: {}
};

exports.initChatzz = function(httpServer) {
    IO = ioLib(httpServer);
    init(IO);
};

var init = function(IO) {
    IO.on('connection', function(socket) {
        socket.on('disconnect', function() {
            SocketMethods.onUnregister(socket, socketConnections);
        });

        //notifies system the user is logged in
        socket.on('connect-user', function(data) {
            SocketMethods.onConnectUser(socket, socketConnections, data);
        });

        //request system to create a new chat room
        socket.on('add-chat-user', function(data) {
            SocketMethods.onAddChatUser(socket, socketConnections, data);
        });

        //requests system to get messages from specific chat
        socket.on('get-old-messages', function(data) {
            SocketMethods.onGetOldMessages(socket, socketConnections, data);
        });

        //request system to send message
        socket.on('send-message', function(data) {
            SocketMethods.onSendMessage(socket, socketConnections, data);
        });

        //notifies system that user have read the message
        socket.on('message-read', function(data) {
            SocketMethods.onChangeMessageStatus(socketConnections, data);
        });
    });

    socketConnections.IO = IO;
};