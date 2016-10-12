module.exports = function(callback){
    "use strict";
    require('geckodriver')
    const assert = require('assert')
    const redis = require('redis');
    const redisClient = redis.createClient();

    var webdriver = require('selenium-webdriver'), By = webdriver.By
    var browser = new webdriver.Builder().usingServer().withCapabilities({'browserName': 'firefox'}).build()

    redisClient.del('devusernamearandom user name')

    function deleteChat(browser) {
        browser.findElement(By.className('deleteCorrespondence')).click().then(function () {
            browser.sleep(1000)
            browser.findElement(By.className('yesDeleteCorrespondence')).click().then(function () {
                browser.sleep(1000)
                browser.findElements(By.css('.table h6')).then(function (messageEl) {
                    assert.equal(0, messageEl.length)
                    browser.quit()
                    callback()
                })
            })
        })
    }





    function loginSuccess(browser, callback) {
        browser.get('http://localhost:5000/messengerReact')
        browser.findElement(By.className('usernameLogin')).then(function (username) {
            username.sendKeys('arandom user name').then(function () {
                browser.findElement(By.className('passwordLogin')).then(function (password) {
                    password.sendKeys('brandom password').then(function () {
                        browser.findElement(By.css('.loginForm button')).click().then(function () {
                            callback()
                        })
                    })
                })
            })
        })
    }

    function saveChat(browser) {
        browser.findElement(By.className('saveCorrespondence')).click().then(function () {
            browser.findElement(By.className('chatSavedMessage')).then(function (chatSavedMessage) {
                chatSavedMessage.getText().then(function (chatSavedText) {
                    assert.equal('Chat Saved!', chatSavedText)
                    browser.sleep(2000).then(function () {
                        loginSuccess(browser, function () {
                            browser.sleep(1000).then(function () {
                                browser.findElement(By.css('.table h6')).then(function (messageEl) {
                                    messageEl.getText().then(function (messageText) {
                                        assert.equal('my message', messageText)
                                        deleteChat(browser)
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    }

    function writeMessage(browser) {
        browser.findElement(By.css('.messageForm input')).then(function (input) {
            input.sendKeys('my message').then(function () {
                browser.findElement(By.css('.messageForm button')).click().then(function () {
                    browser.sleep(1000).then(function () {
                        browser.findElement(By.css('.table h6')).then(function (messageEl) {
                            messageEl.getText().then(function (messageText) {
                                assert.equal('my message', messageText)
                                saveChat(browser)
                            })
                        })
                    })
                })
            })
        })
    }


    function login(browser) {
        browser.get('http://localhost:5000/messengerReact')
        browser.findElement(By.className('usernameLogin')).then(function (username) {
            username.sendKeys('a').then(function () {
                browser.findElement(By.className('passwordLogin')).then(function (password) {
                    password.sendKeys('').then(function () {
                        browser.findElement(By.css('.loginForm button')).click().then(function () {
                            browser.findElement(By.className('loginError')).then(function (loginErrorEl) {
                                loginErrorEl.getText().then(function (loginErrorText) {
                                    assert.equal('No such username and password', loginErrorText)
                                    browser.findElement(By.className('usernameLogin')).then(function (username) {
                                        username.sendKeys('random user name').then(function () {
                                            browser.findElement(By.className('passwordLogin')).then(function (password) {
                                                password.sendKeys('brandom password').then(function () {
                                                    browser.findElement(By.css('.loginForm button')).click().then(function () {
                                                        browser.findElement(By.css('h3')).then(function (helloUsernameEl) {
                                                            helloUsernameEl.getText().then(function (helloUsernameText) {
                                                                assert.equal('Hello arandom user name!', helloUsernameText)
                                                                writeMessage(browser)
                                                            })
                                                        })
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    }

    function testMessenger(browser){
        function signup(browser) {
            browser.get('http://localhost:5000/messengerReact')
            browser.findElement(By.className('usernameSignup')).then(function (username) {
                username.sendKeys('a').then(function () {
                    browser.findElement(By.className('passwordSignup1')).then(function (password1) {
                        password1.sendKeys('b').then(function () {
                            browser.findElement(By.className('passwordSignup2')).then(function (password2) {
                                browser.findElement(By.css('.signupForm button')).click().then(function () {
                                    browser.findElement(By.className('signupError')).then(function (signupErrorEl1) {
                                        signupErrorEl1.getText().then(function (signupErrorText1) {
                                            assert.equal('Passwords dont match', signupErrorText1)
                                            password2.sendKeys('b').then(function () {
                                                browser.findElement(By.css('.signupForm button')).click().then(function () {
                                                    browser.findElement(By.className('signupError')).then(function (signupErrorEl2) {
                                                        signupErrorEl2.getText().then(function (signupErrorText2) {
                                                            assert.equal('Username a is not available', signupErrorText2)
                                                            browser.findElement(By.className('usernameSignup')).then(function (username) {
                                                                username.sendKeys('random user name').then(function () {
                                                                    browser.findElement(By.className('passwordSignup1')).then(function (password1) {
                                                                        password1.sendKeys('random password').then(function () {
                                                                            browser.findElement(By.className('passwordSignup2')).then(function (password2) {
                                                                                password2.sendKeys('random password').then(function () {
                                                                                    browser.findElement(By.css('.signupForm button')).click().then(function () {
                                                                                        browser.findElement(By.css('h3')).then(function (helloUsernameEl) {
                                                                                            helloUsernameEl.getText().then(function (helloUsernameText) {
                                                                                                assert.equal('Hello arandom user name!', helloUsernameText)
                                                                                                login(browser)
                                                                                            })
                                                                                        })
                                                                                    })
                                                                                })
                                                                            })
                                                                        })
                                                                    })
                                                                })
                                                            })
                                                        })
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    })
                })
            })
        }
        signup(browser)
    }




    testMessenger(browser)
}

