module.exports = function (callback) {
    "use strict";
    require('geckodriver')
    const assert = require('assert')
    const redis = require('redis');
    const redisClient = redis.createClient();
    var redisEnv = 'dev'

    var webdriver = require('selenium-webdriver'), By = webdriver.By
    var browser = new webdriver.Builder().usingServer().withCapabilities({'browserName': 'firefox'}).build()

    redisClient.set('dev#usernamePassword#a_random_user','blahblahblah')
    redisClient.del(redisEnv + '#usernamePassword#a_random_user1')
    redisClient.del(redisEnv + '#groupChat#a_random_user1')

    function logout(browser){
        browser.findElement(By.className('logoutBtn')).click().then(function(){
            browser.sleep(5000).then(function(){
                browser.findElement(By.className('usernameLogin')).then(function () {
                    browser.quit()
                    callback()
                })
            })
        })
        
    }

    function deleteChat(browser) {
        browser.findElement(By.className('deleteCorrespondence')).click().then(function () {
            browser.sleep(1000)
            browser.findElement(By.className('yesDeleteCorrespondence')).click().then(function () {
                browser.sleep(1000)
                browser.findElements(By.css('.table h6')).then(function (messageEl) {
                    assert.equal(0, messageEl.length)
                    redisClient.del('devusernamea_random_user1', function(){
                        logout(browser)

                    })
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


    function writeMessage(browser) {
        browser.findElement(By.css('.messageForm input')).then(function (input) {
            input.sendKeys('my message').then(function () {
                browser.findElement(By.css('.messageForm button')).click().then(function () {
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
    }


    function login(browser) {
        browser.findElement(By.className('usernameLogin')).then(function (username) {
            username.sendKeys('a').then(function () {
                browser.findElement(By.className('passwordLogin')).then(function (password) {
                    password.sendKeys('').then(function () {
                        browser.findElement(By.css('.loginForm button')).click().then(function () {
                            browser.findElement(By.className('loginError')).then(function (loginErrorEl) {
                                loginErrorEl.getText().then(function (loginErrorText) {
                                    assert.equal('No such username and password', loginErrorText)
                                    browser.findElement(By.className('usernameLogin')).then(function (username) {
                                        username.sendKeys('_random_user1').then(function () {
                                            browser.findElement(By.className('passwordLogin')).then(function (password) {
                                                password.sendKeys('a_random_user').then(function () {
                                                    browser.findElement(By.css('.loginForm button')).click().then(function () {
                                                        browser.findElement(By.className('h3VerticalMiddle')).then(function (helloUsernameEl) {
                                                            helloUsernameEl.getText().then(function (helloUsernameText) {
                                                                assert.equal('Hello a_random_user1!', helloUsernameText)
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
    function loginAs(browser){
        function noDontLoginAs(){
            browser.get('http://localhost:5000/messengerReact')
            browser.findElement(By.className('noDontLoginAs')).click().then(function(){
                login(browser)
            })
        }

        function yesLoginAs(){
            browser.get('http://localhost:5000/messengerReact')
            browser.findElement(By.className('yesLoginAs')).click().then(function(){
                browser.findElement(By.className('h3VerticalMiddle')).then(function (helloUsernameEl) {
                    helloUsernameEl.getText().then(function (helloUsernameText) {
                        assert.equal('Hello a_random_user1!', helloUsernameText)
                        noDontLoginAs()
                    })
                })
            })
        }

        yesLoginAs()

    }

    function testMessenger(browser) {
        function signup(browser) {
            browser.get('http://localhost:5000/messengerReact')

            function signupSuccess() {
                browser.findElement(By.className('emailSignup')).then(function(email){
                    email.sendKeys('achievendar.tk@gmail.com').then(function(){
                        browser.findElement(By.css('.signupForm button')).click().then(function () {
                            browser.findElement(By.className('h3VerticalMiddle')).then(function (helloUsernameEl) {
                                helloUsernameEl.getText().then(function (helloUsernameText) {
                                    assert.equal('Hello a_random_user1!', helloUsernameText)
                                    loginAs(browser)
                                })
                            })
                        })
                    })
                })
            }
            function signupUserNotAvailable(){
                browser.findElement(By.css('.signupForm button')).click().then(function () {
                    browser.findElement(By.className('signupError')).then(function (signupErrorEl) {
                        signupErrorEl.getText().then(function (signupErrorText) {
                            assert.equal('Username a_random_user is not available', signupErrorText)
                            browser.findElement(By.className('usernameSignup')).then(function (username) {
                                username.sendKeys('1').then(function () {
                                    signupSuccess()
                                })
                            })
                        })
                    })
                })
            }

            function signupPasswordsDontMatch() {
                browser.findElement(By.css('.signupForm button')).click().then(function () {
                    browser.findElement(By.className('signupError')).then(function (signupErrorEl) {
                        signupErrorEl.getText().then(function (signupErrorText) {
                            assert.equal('Passwords dont match', signupErrorText)
                            browser.findElement(By.className('passwordSignup2')).then(function (password2) {
                                password2.sendKeys('a_random_user').then(function () {
                                    signupUserNotAvailable()
                                })
                            })
                        })
                    })
                })
            }


            function signupShortPassword() {
                browser.findElement(By.className('passwordSignup1')).then(function (password1) {
                    password1.sendKeys('a').then(function () {
                        browser.findElement(By.css('.signupForm button')).click().then(function () {
                            browser.findElement(By.className('signupError')).then(function (signupErrorEl) {
                                signupErrorEl.getText().then(function (signupErrorText) {
                                    assert.equal('Password must be at least 8 characters', signupErrorText)
                                    password1.sendKeys('_random_user').then(function () {
                                        signupPasswordsDontMatch()
                                    })
                                })
                            })
                        })
                    })
                })
            }

            function signupShortUsername() {
                browser.findElement(By.className('usernameSignup')).then(function (username) {
                    username.sendKeys('a').then(function () {
                        browser.findElement(By.css('.signupForm button')).click().then(function () {
                            browser.findElement(By.className('signupError')).then(function (signupErrorEl) {
                                signupErrorEl.getText().then(function (signupErrorText) {
                                    assert.equal('Username must be between 8 and 15 characters', signupErrorText)
                                    username.sendKeys('_random_user').then(function () {
                                        signupShortPassword()
                                    })
                                })
                            })
                        })
                    })
                })
            }

            signupShortUsername()
        }




            signup(browser)
        }


        testMessenger(browser)
    }

