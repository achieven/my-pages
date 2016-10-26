var util = require('../../mywebsites/messenger/util/util')
const expect = require('chai').expect
var redis = require('redis')
var redisClient = redis.createClient();
var redisEnv = process.env.NODE_ENV

function deleteUsernameFromDb(username, callback){
    redisClient.del(redisEnv + '#userSalt#' + username, function(err, reply){
        redisClient.del(redisEnv + 'userSalt' + reply, function(){
            redisClient.del(redisEnv + '#usernamePassword#' + username, function(){
                redisClient.del(redisEnv + '#usernameEmail#' + username, function(){
                    callback()
                })
            })
        })
    })
}



describe('addSocket', function () {
    it('should add the socket to the array if it doesnt exist already', function () {
        var allClientSockets = []
        var socketId = 0
        socket = {}
        socketId = util.addSocket(socket, allClientSockets, socketId)
        expect(allClientSockets.length).to.be.equal(1)
        expect(socket.socketId).to.be.equal(1)
        expect(socketId).to.be.equal(1)
    })
})
describe('generateSalt', function () {
    it('should have length of 64', function () {
        var salt = util.generateSalt()
        expect(salt.length).to.be.equal(64)
    })
})

describe('checkSaltAvailability', function () {
    it('should call tryToStoreSalt with error if salt already exists', function (done) {
        var tryToStoreSaltCopy = util.tryToStoreSalt
        var myArg
        util.tryToStoreSalt = function (arg) {
            myArg = arg

        }
        var mySalt = 'mySalt'
        var saltQuery = redisEnv + '#salt#' + mySalt
        redisClient.set(saltQuery, 'whatever', function () {
            util.checkSaltAvailability(redisClient, mySalt)
            setTimeout(function () {
                expect(myArg).to.be.equal('salt already exists')
                redisClient.del(saltQuery, function () {
                    done()
                })
            }, 500)
        })
    })
    it('should call tryToStoreSalt with error null if salt doesnt exists', function (done) {
        var tryToStoreSaltCopy = util.tryToStoreSalt
        var myArg
        util.tryToStoreSalt = function (arg) {
            myArg = arg

        }
        var mySalt = 'mySalt'

        util.checkSaltAvailability(redisClient, mySalt)
        setTimeout(function () {
            expect(myArg).to.be.equal(null)
            done()
        }, 500)

    })
})

describe('storeSalt', function () {
    it('should store the salt as key and as value from the username', function (done) {
        var username = 'a'
        var mySalt = 'mySalt'
        util.storeSalt(redisClient, username, mySalt, function () {
            var saltQuery = redisEnv + '#salt#' + mySalt
            var saltUsernameQuery = redisEnv + '#userSalt#' + username
            redisClient.get(saltQuery, function (err, reply) {
                expect(reply).to.be.equal('doesnt matter what is inerted here')
                redisClient.get(saltUsernameQuery, function (err, reply) {
                    expect(reply).to.be.equal(mySalt)
                    done()
                })
            })
        })
    })
})

describe('tryToStoreSalt', function () {
    var arg1, arg2
    it('should call checkSaltAvailability if there is an error', function (done) {
        util.checkSaltAvailability = function (arg) {
            arg1 = arg
        }
        util.tryToStoreSalt('some error', null, null, 1)
        setTimeout(function () {
            expect(arg1).to.be.equal(1)
            done()
        }, 500)
    })
    it('should call storeSalt if there is an error', function (done) {
        util.storeSalt = function (arg) {
            arg2 = arg
        }
        util.tryToStoreSalt(null, null, null, 2)
        setTimeout(function () {
            expect(arg2).to.be.equal(2)
            done()
        }, 500)
    })
})

describe('signup', function () {
    it('should fail signup when username already exists', function (done) {
        var data = {
            username: 'a',
            password: 'b'
        }
        var query = redisEnv + '#usernamePassword#' + data.username
        redisClient.set(query, data.password, function () {
            util.signup(redisClient, data, function (message, param) {
                expect(message).to.be.equal('signupFail')
                expect(param).to.be.equal(data.username)
                redisClient.del(query, function () {
                    done()
                })
            })
        })
    })
    it('should succeed when username doesnt already exist and store salt as key, as value and hashed salt and password in database', function (done) {

        var data = {
            username: 'new user name',
            password: 'password',
            email: 'email'
        }
        
        var counter = 0


        util.signup(redisClient, data, function (message, param) {
            counter ++
            if(counter === 1){
                expect(message).to.be.equal('signupSuccess')
            }
            else if (counter === 2){
                expect(message).to.be.equal('addOnlineUser')
            }
            if(counter === 2) {

                expect(param).to.be.equal(data.username)
                var userSaltQuery = redisEnv + '#userSalt#' + data.username
                redisClient.get(userSaltQuery, function (err, reply) {
                    expect(reply).to.be.a('string')
                    expect(reply.length).to.be.equal(64)
                    var saltQuery = redisEnv + '#salt#' + reply
                    redisClient.get(saltQuery, function (err, reply) {
                        expect(reply).to.be.equal('doesnt matter what is inerted here')
                        var userPasswordQuery = redisEnv + '#usernamePassword#' + data.username
                        redisClient.get(userPasswordQuery, function (err, reply) {
                            expect(reply).to.be.a('string')
                            expect(reply.length).to.be.equal(64)
                            var userEmailQuery = redisEnv + '#usernameEmail#' + data.username
                            redisClient.get(userEmailQuery, function(err, reply){
                                expect(reply).to.be.equal(data.email)
                                deleteUsernameFromDb(data.username, function(){
                                    done()
                                })
                            })
                           
                        })
                    })
                })
            }
        })
    })
})

describe('login', function () {
    it('should fail the login if the username doesnt exist', function (done) {
        var data = {
            username: 'not existing username',
            password: '1234'
        }
        util.login(redisClient, data, function (message, param) {
            expect(message).to.be.equal('loginFail')
            expect(param).to.be.undefined
            done()
        })
    })
    it('should fail login if username and passwords dont match', function (done) {
        var data = {
            username: 'a',
            password: 'b'
        }
 
        var counter = 0
        
        util.signup(redisClient, data, function(){
            counter++
            if(counter === 2){
                var wrongPasswordData = {
                    username: 'a',
                    password: 'c'
                }

                util.login(redisClient, wrongPasswordData, function (message, param) {
                    expect(message).to.be.equal('loginFail')
                    expect(param).to.be.undefined
                    deleteUsernameFromDb(data.username, function(){
                        done()
                    })
                })
            }
            
        })
        
    })
    it('should succeed login when username and password exist', function (done) {
        var data = {
            username: 'a',
            password: 'b'
        }
       
        var counter = 0
         util.signup(redisClient, data, function(){
             counter ++
             if(counter === 2){
                 util.login(redisClient, data, function (message, param) {
                     expect(message).to.be.equal('loginSuccess')
                     expect(param).to.be.equal(data.username)
                     redisClient.get(redisEnv + '#userSalt#' + data.username, function(err, reply){
                         deleteUsernameFromDb(data.username, function(){
                             done()
                         })
                     })
                 })
             }
        })
    })
})

describe('forgotPassword', function(){
    it('send fake notification that email was sent if user doesnt exist in database and not insert token to database', function(done){
        var usernameThatDoesntExist = 'user#that#doesnt#exist'
        var usernameEmailQuery = redisEnv + '#usernameEmail#' + usernameThatDoesntExist
        redisClient.exists(usernameEmailQuery, function(err, reply){
            expect(reply).to.be.equal(0)
            util.forgotPassword(redisClient, usernameThatDoesntExist, function(message){
                expect(message).to.be.equal('sentResetPasswordEmail')
                var userTokenQuery = redisEnv + '#usernameForgotPasswordToken#' + usernameThatDoesntExist
                redisClient.exists(userTokenQuery, function(err, reply) {
                    expect(reply).to.be.equal(0)
                    done()
                })
            })
        })
    })
    it('should sent real notification that email was sent if user doesnt exist in database and insert token to database', function(done){
        this.timeout(5000)
        var usernameThatWillExist = 'userThatwillExist'
        var usernameEmailQuery = redisEnv + '#usernameEmail#' + usernameThatWillExist
        var userEmail = 'achievendar.tk@gmail.com'
        redisClient.exists(usernameEmailQuery, function(err, reply){
            expect(reply).to.be.equal(0)
            redisClient.set(usernameEmailQuery, userEmail, function(){
                util.forgotPassword(redisClient, usernameThatWillExist, function(message){
                    expect(message).to.be.equal('sentResetPasswordEmail')
                    var userTokenQuery = redisEnv + '#usernameForgotPasswordToken#' + usernameThatWillExist
                    redisClient.exists(userTokenQuery, function(err, reply) {
                        expect(reply).to.be.equal(1)
                        redisClient.del(userTokenQuery, function(){
                            redisClient.del(usernameEmailQuery, function(){
                                done()
                            })
                        })
                    })
                })
            })
        })
    })
})

describe('resetPassword', function(){
    it('should send reset password fail if the user doesnt hold this token and not store password in database', function(done){
        var token = 'some token'
        var usernameThatWillExist = 'userThatwillExist'
        var password = 'some password'
        var data = {
            username: usernameThatWillExist,
            password: password,
            token: token
        }
        var userTokenQuery = redisEnv + '#usernameForgotPasswordToken#' + usernameThatWillExist
        var userPasswordQuery = redisEnv + '#usernamePassword#' + usernameThatWillExist
        
        redisClient.exists(userTokenQuery, function(err, reply){
            expect(reply).to.be.equal(0)
            util.resetPassword(redisClient,data,function(message, param){
                expect(message).to.be.equal('resetPasswordFail')
                expect(param).to.be.equal('This is not your username, dont try to fool me!')
                redisClient.exists(userPasswordQuery, function(err, reply){
                    expect(reply).to.be.equal(0)
                    done()
                })
            })
        })
        })
       
    it('should send reset password success if the user doesnt holds this token, store password in database and remove the token', function(done){
        var token = 'some token'
        var hashedToken = util.getHashedPasswordAndSalt('',token)
        var password = 'some password'
        var usernameThatWillExist = 'userThatwillExist'
        var usernameEmailQuery = redisEnv + '#usernameEmail#' + usernameThatWillExist
        var userTokenQuery = redisEnv + '#usernameForgotPasswordToken#' + usernameThatWillExist
        var userPasswordQuery = redisEnv + '#usernamePassword#' + usernameThatWillExist
        var data = {
            username: usernameThatWillExist,
            password: password,
            token: token
        }
        redisClient.exists(userTokenQuery, function(err, reply){
            expect(reply).to.be.equal(0)
            redisClient.exists(userPasswordQuery, function(err, reply){
                expect(reply).to.be.equal(0)
                redisClient.set(userTokenQuery, hashedToken, function(){
                    util.resetPassword(redisClient,data, function(message, param){
                        expect(message).to.be.equal('resetPasswordSuccess')
                        expect(param).to.be.equal(usernameThatWillExist)
                        redisClient.exists(userTokenQuery, function(err, reply){
                            expect(reply).to.be.equal(0)
                            redisClient.exists(userPasswordQuery, function(err, reply){
                                expect(reply).to.be.equal(1)
                                redisClient.del(userPasswordQuery, function(){
                                    done()
                                })
                            })
                        })
                    })
                })
            })
        })
    })
})

describe('getOnlineUsers', function () {
    it('should return a list of all usernames and new messages zero and emit it to the client', function (done) {
        var allClientSockets = [{username: 1}, {username: 2}]
        var counter = 0
        util.getOnlineUsers(allClientSockets, function (_socket, message, param) {
            expect(message).to.be.equal('showOnlineUsers')
            expect(param.length).to.be.equal(2)
            expect(param[0]).to.eql({username: 1, newMessages: 0})
            expect(param[1]).to.eql({username: 2, newMessages: 0})
            counter++
            if (counter == 2) {
                done()
            }
        })
    })
})

describe('openPrivateChat', function () {
    it('should return empty array if private chat has not been initialized yet', function (done) {
        var chatParticipants = {from: 1, to: 2}
        util.openPrivateChat(redisClient, chatParticipants, function (message, param) {
            expect(message).to.be.equal('showPrivateChat')
            expect(param).to.eql([])
            done()
        })
    })
    it('should return empty array if private chat has been initialized but no message was written', function (done) {
        var chatParticipants = {from: 1, to: 2}
        util.openPrivateChat(redisClient, chatParticipants, function (message, param) {
            expect(message).to.be.equal('showPrivateChat')
            expect(param).to.eql([])
            done()
        })
    })
    it('should return array with messages if messages were written to this private chat', function (done) {
        var chatParticipants = {from: 1, to: 2}
        var insertedMessages = [{message: 'hi', from: chatParticipants.from}]
        var query = redisEnv + '#privateChat#' + chatParticipants.from + '#' + chatParticipants.to
        redisClient.set(query, JSON.stringify(insertedMessages), function () {
            util.openPrivateChat(redisClient, chatParticipants, function (message, param) {
                expect(message).to.be.equal('showPrivateChat')
                expect(param).to.eql(insertedMessages)
                redisClient.del(query, function(){
                    done()
                })
            })
        })
    })

})

describe('openGroupChat', function () {
    it('should return empty array if group chat has not been initialized yet', function (done) {
        var username = 1
        util.openGroupChat(redisClient, username, function (message, param) {
            expect(message).to.be.equal('showGroupChat')
            expect(param).to.eql([])
            done()
        })
    })
    it('should return empty array if private chat has been initialized but no message was written', function (done) {
        var username = 1
        util.openGroupChat(redisClient, username, function (message, param) {
            expect(message).to.be.equal('showGroupChat')
            expect(param).to.eql([])
            done()
        })
    })
    it('should return array with messages if messages were written to this private chat', function (done) {
        var username = 1
        var insertedMessages = [{message: 'hi', from: 2}]
        var query = redisEnv + '#groupChat#' + username
        redisClient.set(query, JSON.stringify(insertedMessages), function () {
            util.openGroupChat(redisClient, username, function (message, param) {
                expect(message).to.be.equal('showGroupChat')
                expect(param).to.eql(insertedMessages)
                redisClient.del(query, function(){
                    done() 
                })
                
            })
        })
    })

})

describe('sendMessage', function () {
    it('should add message to sender and receiver database and send data to the client', function (done) {
        var senderSocket = {username: 1}
        var receiverSocket = {username: 2}
        var allClientSockets = [senderSocket, receiverSocket]
        var data = {from: senderSocket.username, to: receiverSocket.username, message: 'hello'}
        var fromToQuery = redisEnv + '#privateChat#' + data.from + '#' + data.to
        var toFromQuery = redisEnv + '#privateChat#' + data.to + '#' + data.from
        var counter = 0;
        util.sendMessage(senderSocket, redisClient, allClientSockets, data, function (_socket, message, param) {
            setTimeout(function () {
                if (_socket.username === data.from) {
                    expect(message).to.be.equal('serverMessageToMe')
                    expect(param).to.eql(data)
                }
                else if (_socket.username === data.to) {
                    expect(message).to.be.equal('serverMessageToOther')
                    expect(param).to.eql(data)
                }
                var fromToQuery = redisEnv + '#privateChat#' + data.from + '#' + data.to
                var toFromQuery = redisEnv + '#privateChat#' + data.to + '#' + data.from
                redisClient.get(fromToQuery, function (err, messages) {
                    var messagesArray = JSON.parse(messages)
                    expect(messagesArray.length).to.be.equal(1)
                    expect(messagesArray[0]).to.eql({message: data.message, from: data.from})
                    redisClient.get(toFromQuery, function (err, messages) {
                        var messagesArray = JSON.parse(messages)
                        expect(messagesArray.length).to.be.equal(1)
                        expect(messagesArray[0]).to.eql({message: data.message, from: data.from})
                        counter++
                        if (counter === 2) {
                            redisClient.del(fromToQuery, function () {
                                redisClient.del(toFromQuery, function () {
                                    done()
                                })
                            })
                        }
                    })
                })

            }, 500)
        })
    })
    it('should add message to group chat for everyone who is online and send data to the client', function (done) {

        var senderSocket = {username: 1}
        var receiverSocket1 = {username: 2}
        var receiverSocket2 = {username: 3}
        var senderQuery = redisEnv + '#groupChat#' + senderSocket.username
        var receiverQuery1 = redisEnv + '#groupChat#' + receiverSocket1.username
        var receiverQuery2 = redisEnv + '#groupChat#' + receiverSocket2.username

        var allClientSockets = [senderSocket, receiverSocket1, receiverSocket2]
        var data = {from: senderSocket.username, to: undefined, message: 'hello'}
        var counter = 0
        util.sendMessage(senderSocket, redisClient, allClientSockets, data, function (_socket, message, param) {
            setTimeout(function () {
                if (_socket.username === data.from) {
                    expect(message).to.be.equal('serverMessageToMe')
                    expect(param).to.eql(data)
                }
                else {
                    expect(message).to.be.equal('serverMessageToOther')
                    expect(param).to.eql(data)
                }
                var senderQuery = redisEnv + '#groupChat#' + senderSocket.username
                var receiverQuery1 = redisEnv + '#groupChat#' + receiverSocket1.username
                var receiverQuery2 = redisEnv + '#groupChat#' + receiverSocket2.username
                
                counter++

                counter === 3 && redisClient.get(senderQuery, function (err, messages) {
                    var messagesArray = JSON.parse(messages)
                    expect(messagesArray.length).to.be.equal(1)
                    expect(messagesArray[0]).to.eql({
                        message: data.message,
                        from: data.from
                    })
                    redisClient.get(receiverQuery1, function (err, messages) {
                        var messagesArray = JSON.parse(messages)
                        expect(messagesArray.length).to.be.equal(1)
                        expect(messagesArray[0]).to.eql({
                            message: data.message,
                            from: data.from
                        })
                        redisClient.get(receiverQuery2, function (err, messages) {
                            var messagesArray = JSON.parse(messages)
                            expect(messagesArray.length).to.be.equal(1)
                            expect(messagesArray[0]).to.eql({
                                message: data.message,
                                from: data.from
                            })
                            redisClient.del(senderQuery, function () {
                                redisClient.del(receiverQuery1, function () {
                                    redisClient.del(receiverQuery2, function () {
                                        done()
                                    })
                                })
                            })
                        })
                    })
                })

            }, 500)
        })


    })
})

describe('deleteChat', function () {
    it('should delete the chat for the deleter only in private chat', function (done) {
        var deleterUsername = 1
        var deleteChatWith = 2
        var fromToQuery = redisEnv + '#privateChat#' + deleterUsername + '#' + deleteChatWith
        var toFromQuery = redisEnv + '#privateChat#' + deleteChatWith + '#' + deleterUsername
        var messagesSent = [{message: 'hello', from: deleterUsername}]
        redisClient.set(fromToQuery, JSON.stringify(messagesSent), function () {
            redisClient.set(toFromQuery, JSON.stringify(messagesSent), function () {
                util.deleteChat(redisClient, deleterUsername, deleteChatWith, function (message) {
                    expect(message).to.be.equal('correspondenceDeleted')
                    redisClient.exists(fromToQuery, function (err, reply) {
                        expect(reply).to.be.equal(0)
                        redisClient.get(toFromQuery, function (err, messages) {
                            var messagesArray = JSON.parse(messages)
                            expect(messagesArray.length).to.be.equal(1)
                            expect(messagesArray[0]).to.eql(messagesSent[0])
                            redisClient.del(toFromQuery, function () {
                                done()
                            })
                        })
                    })
                })
            })
        })
    })

    it('should delete the chat for the deleter only in group chat', function (done) {
        var deleterUsername = 1
        var otherUsernameInGroup = 2
        var deleterQuery = redisEnv + '#groupChat#' + deleterUsername
        var otherUserQuery = redisEnv + '#groupChat#' + otherUsernameInGroup
        var messagesSent = [{message: 'hello', from: deleterUsername}]
        redisClient.set(deleterQuery, JSON.stringify(messagesSent), function () {
            redisClient.set(otherUserQuery, JSON.stringify(messagesSent), function () {
                util.deleteChat(redisClient, deleterUsername, undefined, function (message) {
                    expect(message).to.be.equal('correspondenceDeleted')
                    redisClient.exists(deleterQuery, function (err, reply) {
                        expect(reply).to.be.equal(0)
                        redisClient.get(otherUserQuery, function (err, messages) {
                            var messagesArray = JSON.parse(messages)
                            expect(messagesArray.length).to.be.equal(1)
                            expect(messagesArray[0]).to.eql(messagesSent[0])
                            redisClient.del(otherUserQuery, function () {
                                done()
                            })
                        })
                    })
                })
            })
        })
    })
})

describe('removeSocket', function () {
    it('should remove the socket from the array', function () {
        var allClientSockets = [
            {socketId: 1},
            {socketId: 2}
        ]
        var socket = {socketId: 1}
        allClientSockets = util.removeSocket(socket, allClientSockets)
        expect(allClientSockets.length).to.be.equal(1)
        expect(allClientSockets[0]).to.eql({socketId: 2})
    })
})
