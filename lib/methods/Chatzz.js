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

        socket.on('connect-user', function(data) {
            SocketMethods.onConnectUser(socket, socketConnections, data);
        });

        socket.on('add-chat-user', function(data) {
            SocketMethods.onAddChatUser(socket, socketConnections, data);
        });

        socket.on('get-old-messages', function(data) {
            SocketMethods.onGetOldMessages(socket, socketConnections, data);
        });

        socket.on('send-message', function(data) {
            SocketMethods.onSendMessage(socket, socketConnections, data);
        });

        socket.on('message-read', function(data) {
            data.newStatus = ChatMessageMethods.getMessageReadStatus();
            SocketMethods.onChangeMessageStatus(socketConnections, data);
        });

        socket.on('change-message-status', function(data) {
            SocketMethods.onChangeMessageStatus(socketConnections, data);
        });
    });

    socketConnections.IO = IO;
};