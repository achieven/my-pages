var redisEnv = process.env.NODE_ENV

var util = {
    addSocket: function (socket, allClientSockets, socketId) {
        socketId++
        socket.socketId = socketId
        allClientSockets.push(socket)
        return socketId

    },
    login: function (redisClient, data, callback) {
        var queryUsername = redisEnv + 'username' + data.username
        var queryPassword = redisEnv + 'password' + data.password
        redisClient.exists(queryUsername, function (err, reply) {
            if (reply === 1) {
                redisClient.get(queryUsername, function (err, password) {
                    if (queryPassword === password) {
                        callback('loginSuccess', data.username)
                    }
                    else {
                        callback('loginFail')
                    }
                })
            }
            else {
                callback('loginFail')
            }
        })
    },
    signup: function (redisClient, data, callback) {
        var queryUsername = redisEnv + 'username' + data.username
        var queryPassword = redisEnv + 'password' + data.password
        redisClient.exists(queryUsername, function (err, reply) {
            if (reply === 1) {
                callback('signupFail', data.username)
            }
            else {
                redisClient.set(queryUsername, queryPassword, function (err, reply) {
                    callback('signupSuccess', data.username)
                })
            }
        })
    },
    getOnlineUsers: function (socket, allClientSockets, callback) {
        var onlineUsers = []
        allClientSockets.forEach(function (_socket) {
            _socket.username && onlineUsers.push(_socket.username)
        })
        allClientSockets.forEach(function (_socket) {
            _socket.username && callback(_socket, 'showOnlineUsers', onlineUsers)
        })

    },
    openPrivateChat: function (redisClient, chatParticipants, callback) {
        var privateChatInDB = process.env.NODE_ENV + 'privateChat' + chatParticipants.from + '#' + chatParticipants.to
        redisClient.exists(privateChatInDB, function(err, reply){
            if(reply === 1){
                callback('showPrivateChat', messages)
            }
            else {
                callback('showPrivateChat', [])
            }
        })
    },
    sendMessage: function (socket, allClientSockets, data, callback) {
        data.socketId = socket.socketId
        allClientSockets.forEach(function (_socket) {
            if (socket.socketId != _socket.socketId) {
                callback(_socket, 'serverMessageToOther', data)
            }
            else {
                callback(_socket, 'serverMessageToMe', data)
            }
        })
    },
    saveChat: function (redisClient, data, callback) {
        var redisCorrespondence = redisEnv + 'correspondence' + data.username
        redisClient.set(redisCorrespondence, JSON.stringify(data.messages), function () {
            callback('correspondenceSaved')
        })
    },
    showChat: function (socket, redisClient, username) {
        var redisCorrespondence = redisEnv + 'correspondence' + username
        redisClient.get(redisCorrespondence, function (err, messages) {
            messages && socket.emit('showCorrespondence', JSON.parse(messages))
        })
    },
    deleteChat: function (redisClient, username, callback) {
        var redisCorrespondence = redisEnv + 'correspondence' + username
        redisClient.del(redisCorrespondence, function (err, reply) {
            callback('correspondenceDeleted')
        })
    },
    removeSocket(socket, allClientSockets){
        allClientSockets = allClientSockets.filter(function (_socket) {
            return socket.socketId != _socket.socketId
        })
        return allClientSockets
    }
}
module.exports = util