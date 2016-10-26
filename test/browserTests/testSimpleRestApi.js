module.exports = function(callback){
    "use strict";
    require('geckodriver')
    const assert = require('assert')
    const redis = require('redis');
    const redisClient = redis.createClient();

    var webdriver = require('selenium-webdriver'), By = webdriver.By
    var browser = new webdriver.Builder().usingServer().withCapabilities({'browserName': 'firefox'}).build()
    browser.get('http://localhost:5000/simplerestapi')

    function testSimpleRestApi() {
        function deleteUser() {
            browser.findElement(By.css('.editPerson .btn-danger')).click(). then(function () {
                browser.sleep(1000).then(function(){
                    browser.findElements(By.css('.editPerson span')).then(function (personEl) {
                        assert.equal(0, personEl.length)
                        browser.quit()
                        callback()
                    })
                })
            })
        }

        function editUser() {
            browser.findElement(By.css('[data-target="#editPersonModal"]')).click().then(function () {
                browser.sleep(1000).then(function () {
                    browser.findElement(By.className('editName')).then(function (nameInput) {
                        nameInput.sendKeys('1').then(function () {
                            browser.findElement(By.className('editBio')).then(function (bioInput) {
                                bioInput.sendKeys('1').then(function () {
                                    browser.findElement(By.className('editFb_id')).then(function (fb_idInput) {
                                        fb_idInput.sendKeys('1').then(function () {
                                            browser.findElement(By.className('savePersonChanges')).click().then(function () {
                                                browser.sleep(1000).then(function () {
                                                    browser.findElement(By.css('.editPerson span')).then(function (personEl) {
                                                        personEl.getText().then(function (personNameText) {
                                                            assert.equal('a1', personNameText)
                                                            deleteUser()

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

        function createUser() {
            browser.findElement(By.className('createdName')).then(function (nameInput) {
                nameInput.sendKeys('a').then(function () {
                    browser.findElement(By.className('createdBio')).then(function (bioInput) {
                        bioInput.sendKeys('b').then(function () {
                            browser.findElement(By.className('createdFb_id')).then(function (fb_idInput) {
                                fb_idInput.sendKeys('c').then(function () {
                                    browser.findElement(By.css('#postProfile button')).click().then(function () {
                                        browser.sleep(500).then(function () {
                                            browser.findElement(By.css('.editPerson span')).then(function (personEl) {
                                                personEl.getText().then(function (personNameText) {
                                                    assert.equal('a', personNameText)
                                                    editUser()
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

        createUser()
    }

    testSimpleRestApi()
}

