module.exports = function (callback) {
    "use strict";
    require('geckodriver')
    const assert = require('assert')

    var webdriver = require('selenium-webdriver'), By = webdriver.By
    var browser = new webdriver.Builder().usingServer().withCapabilities({'browserName': 'firefox'}).build();

    browser.get('http://localhost:5000/backend')
    browser.findElement(By.className('issueAssetsBtn')).click().then(function () {
        browser.sleep(20000).then(function () {
            browser.findElements(By.css('.issueAssetsResponse li')).then(function (issuedAssets) {
                assert.equal(issuedAssets.length, 2)
                browser.findElement(By.className('getAssetsBtn')).click().then(function () {
                    browser.sleep(5000).then(function () {
                        browser.findElement(By.className('getAssetsResponse')).then(function () {
                            browser.findElements(By.css('.getAssetsResponse li')).then(function (assets) {
                                assert(true, assets.length >= 2)
                                var firstAssetId, secondAssetAddress
                                assets.forEach(function (asset, index) {
                                    asset.getText().then(function (text) {
                                        if (index === 0) {
                                            firstAssetId = text.substr(10, 38)
                                        }
                                        if (index === 1) {
                                            secondAssetAddress = text.substr(65)
                                            browser.findElement(By.className('toAddress')).then(function (toAddress) {
                                                toAddress.sendKeys(secondAssetAddress)
                                                browser.sleep(1000)
                                                browser.findElement(By.className('assetId')).then(function (assetId) {
                                                    assetId.sendKeys(firstAssetId)
                                                    browser.sleep(1000)
                                                    browser.findElement(By.className('amount')).then(function (amount) {
                                                        amount.sendKeys(1)
                                                        browser.sleep(1000)
                                                        browser.findElement(By.className('sendAssetBtn')).click().then(function () {
                                                            browser.sleep(10000).then(function () {
                                                                browser.findElement(By.css('.sendAssetResponse li')).then(function (transactionLi) {
                                                                    transactionLi.getText().then(function (trxId) {
                                                                        assert.equal(trxId.length, 64)
                                                                        browser.quit()
                                                                        callback()
                                                                    })
                                                                })
                                                            })

                                                        })
                                                    })
                                                })
                                            })
                                        }
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



