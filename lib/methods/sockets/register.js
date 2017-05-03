module.exports = function(socket, socketConnections, userId) {
    var socketId = socket.id;

    if (socketConnections.userToSocketMap[userId]) {
        if (socketConnections.userToSocketMap[userId].indexOf(socketId) === -1) {
            socketConnections.userToSocketMap[userId].push(socketId);
        }
    } else {
        socketConnections.userToSocketMap[userId] = [socketId];
    }

    socketConnections.socketToUserMap[socketId] = userId;
};