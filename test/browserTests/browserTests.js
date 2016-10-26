var testBackend = require('./testBackend')
var testEmitter = require('./testEmitter')
var testMessenger = require('./testMessenger')
var testSimpleRestApi = require('./testSimpleRestApi')
var testUserDetails = require('./testUserDetails')

testBackend(function(){
    testEmitter(function(){
       testMessenger(function(){
            testSimpleRestApi(function(){
                process.exit()
            })
       })
    })
})


