var util = require('../../mywebsites/messenger/util/util')
const expect = require('chai').expect
var redis = require('redis')
var redisClient = redis.createClient();
 describe('addSocket', function(){
     it('should add the socket to the array if it doesnt exist already', function(){
         var allClientSockets = []
         var socketId = 0
         socket = {}
         socketId = util.addSocket(socket, allClientSockets, socketId)
         expect(allClientSockets.length).to.be.equal(1)
         expect(socket.socketId).to.be.equal(1)
         expect(socketId).to.be.equal(1)
     })
 })
describe('login', function(){
    it('should fail the login if the username doesnt exist', function(done){
        var data = {
            username: 'not existing username',
            password: '1234'
        }
        util.login(redisClient, data, function(message, param){
            expect(message).to.be.equal('loginFail')
            expect(param).to.be.undefined
            done()
        })
    })
    it('should fail login if username and passwords dont match', function(done){
        var data = {
            username: 'a',
            password: '1234'
        }
        util.login(redisClient, data, function(message, param){
            expect(message).to.be.equal('loginFail')
            expect(param).to.be.undefined
            done()
        })
    })
    it('should succeed login when username and password exist', function(done){
        var data = {
            username: 'a',
            password: 'b'
        }
        util.login(redisClient, data, function(message, param){
            expect(message).to.be.equal('loginSuccess')
            expect(param).to.be.equal(data.username)
            done()
        })
    })
})

describe('signup', function(){
    it('should fail signup when username already exists', function(done){
        var data = {
            username: 'a',
            password: 'b'
        }
        util.signup(redisClient, data, function(message, param){
            expect(message).to.be.equal('signupFail')
            expect(param).to.be.equal(data.username)
            done()
        })
    })
    it('should succeed when username doesnt already exist', function(done){
        var data = {
            username: 'new user name',
            password: 'password'
        }
        util.signup(redisClient, data, function(message, param){
            expect(message).to.be.equal('signupFail')
            expect(param).to.be.equal(data.username)
            done()
        })
    })
})

describe('sendMessage', function(){
    it('should send message to me if socketId is same and to other if socketId is different', function(){
        var allClientSockets = [
            {socketId: 1},
            {socketId: 2}
        ]
        var socket = {socketId: 1}
        var data = {}
        util.sendMessage(socket,allClientSockets,data, function(_socket, message, param){
            if(_socket.socketId ===1){
                expect(message).to.be.equal('serverMessageToMe')
                expect(param).to.eql({socketId: 1})
            }
            if(_socket.socketId ===2){
                expect(message).to.be.equal('serverMessageToOther')
                expect(param).to.eql({socketId: 1})
            }
        })
    })
})

describe('removeSocket', function(){
    it('should remove the socket from the array', function(){
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