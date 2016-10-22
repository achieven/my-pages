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
                    callback('addOnlineUser', data.username)
                })
            }
        })
    },
    getOnlineUsers: function (allClientSockets, callback) {
        var onlineUsers = []
        allClientSockets.forEach(function (_socket) {
            _socket.username && onlineUsers.push({username: _socket.username, newMessages: 0})
        })
        allClientSockets.forEach(function (_socket) {
            _socket.username && callback(_socket, 'showOnlineUsers', onlineUsers)
        })

    },
    openPrivateChat: function (redisClient, chatParticipants, callback) {
        var privateChatInDB = redisEnv + 'privateChat' + chatParticipants.from + '#' + chatParticipants.to
        redisClient.exists(privateChatInDB, function (err, reply) {
            if (reply === 1) {
                redisClient.get(privateChatInDB, function (err, messages) {
                    callback('showPrivateChat', JSON.parse(messages))
                })
            }
            else {
                redisClient.set(privateChatInDB, JSON.stringify([]), function (err, reply) {
                    callback('showPrivateChat', [])
                })
            }
        })
    },
    openGroupChat: function (redisClient, username, callback) {
        var groupChatInDB = redisEnv + 'groupChat' + username
        redisClient.exists(groupChatInDB, function (err, reply) {
            if (reply === 1) {
                redisClient.get(groupChatInDB, function (err, messages) {
                    callback('showGroupChat', JSON.parse(messages))
                })
            }
            else {
                redisClient.set(groupChatInDB, JSON.stringify([]), function (err, reply) {
                    callback('showGroupChat', [])
                })
            }
        })
    },
    sendMessage: function (socket, redisClient, allClientSockets, data, callback) {
        data.socketId = socket.socketId
        var privateOrGroupChat, fromToPrefix, toFromPrefix
        var privateMessage = !!data.to
        if (privateMessage) {
            privateOrGroupChat = 'privateChat'
            fromToPrefix = data.from + '#' + data.to
            toFromPrefix = data.to + '#' + data.from
            var fromToQuery = redisEnv + privateOrGroupChat + fromToPrefix
            var toFromQuery = redisEnv + privateOrGroupChat + toFromPrefix

            addMessageToDB(fromToQuery);
            addMessageToDB(toFromQuery);
        }
        else {
            privateOrGroupChat = 'groupChat'
            allClientSockets.forEach(function (_socket) {
                var query = redisEnv + privateOrGroupChat + _socket.username
                addMessageToDB(query)
            })
        }

        function addMessageToDB(query) {
            redisClient.exists(query, function (err, reply) {
                if (reply === 1) {
                    redisClient.get(query, function (err, messages) {
                        var messagesArray = JSON.parse(messages)
                        messagesArray.push({
                            message: data.message,
                            from: data.from
                        })
                        var messagesAfterAddition = JSON.stringify(messagesArray) 
                        redisClient.set(query, messagesAfterAddition)
                    })
                }
                else {
                    redisClient.set(query, JSON.stringify([{message: data.message, from: data.from}]))
                }
            })
        }


        allClientSockets.forEach(function (_socket) {
            if(privateMessage){
                if(_socket.username === data.to){
                    callback(_socket, 'serverMessageToOther', data)
                }
                else if(_socket.username === data.from){
                    callback(_socket, 'serverMessageToMe', data)
                }
            }
            else {
                if(_socket.username === data.from){
                    callback(_socket, 'serverMessageToMe', data)
                }
                else {
                    callback(_socket, 'serverMessageToOther', data)
                }
            }
        })
    },
    showChat: function (socket, redisClient, username) {
        var redisCorrespondence = redisEnv + 'correspondence' + username
        redisClient.get(redisCorrespondence, function (err, messages) {
            messages && socket.emit('showCorrespondence', JSON.parse(messages))
        })
    },
    deleteChat: function (redisClient, deleterUsername, deleteChatWith, callback) {
        var privateOrGroupChat, fromToPrefix, toFromPrefix
        if (deleteChatWith) {
            privateOrGroupChat = 'privateChat'
            fromToPrefix = deleterUsername + '#' + deleteChatWith
        }
        else {
            privateOrGroupChat = 'groupChat'
            fromToPrefix = deleterUsername

        }
        var redisCorrespondence = redisEnv + privateOrGroupChat + fromToPrefix
        redisClient.del(redisCorrespondence, function (err, reply) {
            callback('correspondenceDeleted')
        })
    },
    removeSocket: function(socket, allClientSockets){
        allClientSockets = allClientSockets.filter(function (_socket) {
            return socket.socketId != _socket.socketId
        })
        return allClientSockets
    }
}
module.exports = util