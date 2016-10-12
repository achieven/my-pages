module.exports = function(callback){
    "use strict";
    require('geckodriver')
    const assert = require('assert')

    var webdriver = require('selenium-webdriver'), By = webdriver.By
    var browser = new webdriver.Builder().usingServer().withCapabilities({'browserName': 'firefox'}).build()

    browser.get('http://localhost:5000/emitter')
    browser.findElement(By.css('[placeholder="use only positive integers"]')).then(function(input){
        input.sendKeys(4).then(function(){
            browser.findElement(By.className('btn-default')).click().then(function(){
                browser.sleep(2000).then(function(){
                    browser.findElements(By.css('tr')).then(function(tableRows){
                        assert(true, tableRows.length > 0)
                        browser.findElement(By.css('svg')).then(function(chartist){
                            assert(true, !!chartist)
                            browser.quit()
                            callback()
                        })
                    })
                })

            })
        })
    })
}

