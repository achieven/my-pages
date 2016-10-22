var util = require('../../mywebsites/messenger/util/util')
const expect = require('chai').expect
var redis = require('redis')
var redisClient = redis.createClient();
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
            password: '1234'
        }
        util.login(redisClient, data, function (message, param) {
            expect(message).to.be.equal('loginFail')
            expect(param).to.be.undefined
            done()
        })
    })
    it('should succeed login when username and password exist', function (done) {
        var data = {
            username: 'a',
            password: 'b'
        }
        util.login(redisClient, data, function (message, param) {
            expect(message).to.be.equal('loginSuccess')
            expect(param).to.be.equal(data.username)
            done()
        })
    })
})

describe('signup', function () {
    it('should fail signup when username already exists', function (done) {
        var data = {
            username: 'a',
            password: 'b'
        }
        util.signup(redisClient, data, function (message, param) {
            expect(message).to.be.equal('signupFail')
            expect(param).to.be.equal(data.username)
            done()
        })
    })
    it('should succeed when username doesnt already exist', function (done) {
        var data = {
            username: 'new user name',
            password: 'password'
        }
        util.signup(redisClient, data, function (message, param) {
            expect(message).to.be.equal('signupFail')
            expect(param).to.be.equal(data.username)
            done()
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
        var query = process.env.NODE_ENV + 'privateChat' + chatParticipants.from + '#' + chatParticipants.to
        redisClient.set(query, JSON.stringify(insertedMessages), function () {
            util.openPrivateChat(redisClient, chatParticipants, function (message, param) {
                expect(message).to.be.equal('showPrivateChat')
                expect(param).to.eql(insertedMessages)
                redisClient.del(query)
                done()
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
        var query = process.env.NODE_ENV + 'groupChat' + username
        redisClient.set(query, JSON.stringify(insertedMessages), function () {
            util.openGroupChat(redisClient, username, function (message, param) {
                expect(message).to.be.equal('showGroupChat')
                expect(param).to.eql(insertedMessages)
                redisClient.del(query)
                done()
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
        var fromToQuery = process.env.NODE_ENV + 'privateChat' + data.from + '#' + data.to
        var toFromQuery = process.env.NODE_ENV + 'privateChat' + data.to + '#' + data.from
        var counter = 0;
        util.sendMessage(socket, redisClient, allClientSockets, data, function (_socket, message, param) {
            setTimeout(function () {
                if (_socket.username === data.from) {
                    expect(message).to.be.equal('serverMessageToMe')
                    expect(param).to.eql(data)
                }
                else if (_socket.username === data.to) {
                    expect(message).to.be.equal('serverMessageToOther')
                    expect(param).to.eql(data)
                }
                var fromToQuery = process.env.NODE_ENV + 'privateChat' + data.from + '#' + data.to
                var toFromQuery = process.env.NODE_ENV + 'privateChat' + data.to + '#' + data.from
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

            }, 1000)
        })
    })
    it('should add message to group chat for everyone who is online and send data to the client', function (done) {

        var senderSocket = {username: 1}
        var receiverSocket1 = {username: 2}
        var receiverSocket2 = {username: 3}
        var senderQuery = process.env.NODE_ENV + 'groupChat' + senderSocket.username
        var receiverQuery1 = process.env.NODE_ENV + 'groupChat' + receiverSocket1.username
        var receiverQuery2 = process.env.NODE_ENV + 'groupChat' + receiverSocket2.username

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
                var senderQuery = process.env.NODE_ENV + 'groupChat' + senderSocket.username
                var receiverQuery1 = process.env.NODE_ENV + 'groupChat' + receiverSocket1.username
                var receiverQuery2 = process.env.NODE_ENV + 'groupChat' + receiverSocket2.username
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

            }, 1000)
        })


    })
})

describe('deleteChat', function(){
    it('should delete the chat for the deleter only in private chat', function(done){
        var deleterUsername = 1
        var deleteChatWith = 2
        var fromToQuery = process.env.NODE_ENV + 'privateChat' + deleterUsername + '#' + deleteChatWith
        var toFromQuery = process.env.NODE_ENV + 'privateChat' + deleteChatWith + '#' + deleterUsername
        var messagesSent = [{message: 'hello', from: deleterUsername}]
        redisClient.set(fromToQuery, JSON.stringify(messagesSent), function(){
            redisClient.set(toFromQuery, JSON.stringify(messagesSent), function(){
                util.deleteChat(redisClient, deleterUsername, deleteChatWith, function(message){
                    expect(message).to.be.equal('correspondenceDeleted')
                    redisClient.exists(fromToQuery, function(err, reply){
                        expect(reply).to.be.equal(0)
                        redisClient.get(toFromQuery, function(err,messages){
                            var messagesArray = JSON.parse(messages)
                            expect(messagesArray.length).to.be.equal(1)
                            expect(messagesArray[0]).to.eql(messagesSent[0])
                            redisClient.del(toFromQuery, function(){
                                done()
                            })
                        })
                    })
                })
            })
        })
    })

    it('should delete the chat for the deleter only in group chat', function(done){
        var deleterUsername = 1
        var otherUsernameInGroup = 2
        var deleterQuery = process.env.NODE_ENV + 'groupChat' + deleterUsername
        var otherUserQuery = process.env.NODE_ENV + 'groupChat' + otherUsernameInGroup
        var messagesSent = [{message: 'hello', from: deleterUsername}]
        redisClient.set(deleterQuery, JSON.stringify(messagesSent), function(){
            redisClient.set(otherUserQuery, JSON.stringify(messagesSent), function(){
                util.deleteChat(redisClient, deleterUsername, undefined, function(message){
                    expect(message).to.be.equal('correspondenceDeleted')
                    redisClient.exists(deleterQuery, function(err, reply){
                        expect(reply).to.be.equal(0)
                        redisClient.get(otherUserQuery, function(err,messages){
                            var messagesArray = JSON.parse(messages)
                            expect(messagesArray.length).to.be.equal(1)
                            expect(messagesArray[0]).to.eql(messagesSent[0])
                            redisClient.del(otherUserQuery, function(){
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
