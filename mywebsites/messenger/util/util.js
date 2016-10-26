var redisEnv = process.env.NODE_ENV
var sha256 = require('js-sha256').sha256
var nodemailer = require('nodemailer');

var util = {
    addSocket: function (socket, allClientSockets, socketId) {
        socketId++
        socket.socketId = socketId
        allClientSockets.push(socket)
        return socketId

    },
    generateToken: function () {
        var saltLength = 64
        var salt = ''
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        for (var i = 0; i < saltLength; i++) {
            var randomIndex = Math.floor(Math.random() * alphabet.length)
            var randomChar = alphabet.charAt(randomIndex)
            salt += randomChar
        }
        return salt
    },
    generateSalt: function () {
        var saltLength = 64
        var salt = ''
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()-=_`~,./?:'
        for (var i = 0; i < saltLength; i++) {
            var randomIndex = Math.floor(Math.random() * alphabet.length)
            var randomChar = alphabet.charAt(randomIndex)
            salt += randomChar
        }
        return salt
    },
    checkSaltAvailability: function (redisClient, mySalt, username, callback) {
        var thisObject = this
        var saltQuery = redisEnv + '#salt#' + mySalt
        redisClient.exists(saltQuery, function (err, reply) {
            if (reply === 1) {
                thisObject.tryToStoreSalt('salt already exists', null, username, redisClient, callback)
            }
            else {
                thisObject.tryToStoreSalt(null, mySalt, username, redisClient, callback)
            }
        })
    },
    storeSalt: function (redisClient, username, mySalt, callback) {
        var thisObject = this
        var saltQuery = redisEnv + '#salt#' + mySalt
        var saltUsernameQuery = redisEnv + '#userSalt#' + username
        redisClient.set(saltQuery, 'doesnt matter what is inerted here', function () {
            redisClient.set(saltUsernameQuery, mySalt, function () {
                callback(mySalt)
            })
        })
    },
    tryToStoreSalt: function (err, mySalt, username, redisClient, callback) {
        var thisObject = this
        if (err) {
            var salt = thisObject.generateSalt()
            thisObject.checkSaltAvailability(redisClient, salt, username, callback)
        }
        else {
            thisObject.storeSalt(redisClient, username, mySalt, callback)
        }
    },
    generateSaltAndStoreIt: function (redisClient, username, mainCallback) {
        this.tryToStoreSalt('not really error', null, username, redisClient, mainCallback)
    },
    hashSaltAndPasswordAndStoreIt: function (redisClient, username, password, salt, callback) {
        var hashedPasswordAndSalt = this.getHashedPasswordAndSalt(password, salt)
        var queryUsername = redisEnv + '#usernamePassword#' + username
        redisClient.set(queryUsername, hashedPasswordAndSalt, function () {
            callback()
        })
    },
    storeEmail: function (redisClient, username, email, callback) {
        var queryUserEmail = redisEnv + '#usernameEmail#' + username
        redisClient.set(queryUserEmail, email, function () {
            callback()
        })
    },

    signup: function (redisClient, data, callback) {
        var thisObject = this
        var queryUsername = redisEnv + '#usernamePassword#' + data.username
        redisClient.exists(queryUsername, function (err, reply) {
            if (reply === 1) {
                callback('signupFail', data.username)
            }
            else {
                thisObject.generateSaltAndStoreIt(redisClient, data.username, function (salt) {
                    thisObject.hashSaltAndPasswordAndStoreIt(redisClient, data.username, data.password, salt, function () {
                        thisObject.storeEmail(redisClient, data.username, data.email, function () {
                            callback('signupSuccess', data.username)
                            callback('addOnlineUser', data.username)
                        })

                    })
                })
            }
        })
    }
    ,
    getHashedPasswordAndSalt: function (password, salt) {
        return sha256(password + salt)
    },
    login: function (redisClient, data, callback) {
        var thisObject = this
        var queryUsername = redisEnv + '#usernamePassword#' + data.username
        redisClient.exists(queryUsername, function (err, reply) {
            if (reply === 1) {
                var usernameSaltQuery = redisEnv + '#userSalt#' + data.username
                redisClient.get(usernameSaltQuery, function (err, userSalt) {
                    var hashedPasswordAndSaltCheck = thisObject.getHashedPasswordAndSalt(data.password, userSalt)
                    redisClient.get(queryUsername, function (err, hashPasswordAndSaltDb) {
                        if (hashedPasswordAndSaltCheck === hashPasswordAndSaltDb) {
                            callback('loginSuccess', data.username)
                        }
                        else {
                            callback('loginFail')
                        }
                    })
                })
            }
            else {
                callback('loginFail')
            }
        })
    },
    forgotPassword: function (redisClient, username, callback) {
        var thisObject = this

        var userEmailQuery = redisEnv + '#usernameEmail#' + username
        redisClient.get(userEmailQuery, function (err, email) {
            if (!err) {
                var transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'achievendar.tk@gmail.com',
                        pass: 'achievendar.tkPassword'
                    }
                });
                var domain = process.env.NODE_ENV === 'prod' ? 'http://achievendar.tk/' : 'http://localhost:5000/'
                var url = 'messengerReact/resetPassword'
                var token = thisObject.generateToken()
                var queryParams = '?token=' + token
                var link = domain + url + queryParams
                var emailText = 'Hi ' + username + '. Please click on the following link to recover your password. ' + link
                var mailOptions = {
                    from: 'achievendar.tk@gmail.com',
                    to: email,
                    subject: 'Reset password to achievendar.tk messenger',
                    text: emailText
                }
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Message sent: ' + info.response);
                        var userTokenQuery = redisEnv + '#usernameForgotPasswordToken#' + username
                        redisClient.set(userTokenQuery, token, function () {
                            callback('sentResetPasswordEmail')
                        })
                    }
                    ;
                });

            }
        })
    },
    resetPassword: function (redisClient, data, callback) {
        var thisObject = this
        var userTokenQuery = redisEnv + '#usernameForgotPasswordToken#' + data.username
        redisClient.get(userTokenQuery, function (err, token) {
            if (token === data.token) {
                thisObject.generateSaltAndStoreIt(redisClient, data.username, function (salt) {
                    thisObject.hashSaltAndPasswordAndStoreIt(redisClient, data.username, data.password, salt, function () {
                        callback('resetPasswordSuccess', data.username)
                    })
                })
            }
            else {
                callback('resetPasswordFail', 'This is not your username, dont try to fool me!')
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
        var privateChatInDB = redisEnv + '#privateChat#' + chatParticipants.from + '#' + chatParticipants.to
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
        var groupChatInDB = redisEnv + '#groupChat#' + username
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
            privateOrGroupChat = '#privateChat#'
            fromToPrefix = data.from + '#' + data.to
            toFromPrefix = data.to + '#' + data.from
            var fromToQuery = redisEnv + privateOrGroupChat + fromToPrefix
            var toFromQuery = redisEnv + privateOrGroupChat + toFromPrefix

            addMessageToDB(fromToQuery);
            addMessageToDB(toFromQuery);
        }
        else {
            privateOrGroupChat = '#groupChat#'
            allClientSockets.forEach(function (_socket) {
                var query = redisEnv + privateOrGroupChat + _socket.username
                _socket.username && addMessageToDB(query)
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
            if (privateMessage) {
                if (_socket.username === data.to) {
                    callback(_socket, 'serverMessageToOther', data)
                }
                else if (_socket.username === data.from) {
                    callback(_socket, 'serverMessageToMe', data)
                }
            }
            else {
                if (_socket.username === data.from) {
                    callback(_socket, 'serverMessageToMe', data)
                }
                else {
                    callback(_socket, 'serverMessageToOther', data)
                }
            }
        })
    },
    showChat: function (socket, redisClient, username) {
        var redisCorrespondence = redisEnv + '#correspondence#' + username
        redisClient.get(redisCorrespondence, function (err, messages) {
            messages && socket.emit('showCorrespondence', JSON.parse(messages))
        })
    },
    deleteChat: function (redisClient, deleterUsername, deleteChatWith, callback) {
        var privateOrGroupChat, fromToPrefix, toFromPrefix
        if (deleteChatWith) {
            privateOrGroupChat = '#privateChat#'
            fromToPrefix = deleterUsername + '#' + deleteChatWith
        }
        else {
            privateOrGroupChat = '#groupChat#'
            fromToPrefix = deleterUsername

        }
        var redisCorrespondence = redisEnv + privateOrGroupChat + fromToPrefix
        redisClient.del(redisCorrespondence, function (err, reply) {
            callback('correspondenceDeleted')
        })
    },
    removeSocket: function (socket, allClientSockets) {
        allClientSockets = allClientSockets.filter(function (_socket) {
            return socket.socketId != _socket.socketId
        })
        return allClientSockets
    }
}
module.exports = util