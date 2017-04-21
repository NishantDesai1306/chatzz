module.exports = function(socket, socketConnections, userId) {
    var socketId = socket.id;

    if (socketConnections.userToSocketMap[userId]) {
        socketConnections.userToSocketMap[userId].push(socketId);
    } else {
        socketConnections.userToSocketMap[userId] = [socketId];
    }

    socketConnections.socketToUserMap[socketId] = userId;
};