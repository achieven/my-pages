const validationErrorCode = 400
const nonNegativeIntegerRegex = /^\d+$/
const alphanumericNotEmptyRegex = /^[a-z0-9]+$/i
const async = require('async')
const statuses = require('statuses/codes.json')

var validations = {
    validateColuGeneratedString: function (key, value, optionalPrefix) {
        optionalPrefix = optionalPrefix || ''
        var errorCode, errorResponse
        if (!(typeof  value === 'string') || !alphanumericNotEmptyRegex.test(value)) {
            errorCode = validationErrorCode
            errorResponse = optionalPrefix + key + ' is not valid, use non empty alphanumeric string'
        }
        return errorCode ? {errorCode: errorCode, errorResponse: errorResponse} : undefined
    },
    validateNumber: function (key, value, minLimit, maxLimit, optionalPrefix) {
        optionalPrefix = optionalPrefix || ''
        var errorCode, errorResponse
        if (typeof value === 'symbol' || !nonNegativeIntegerRegex.test(value) || parseInt(value) > maxLimit || parseInt(value) < minLimit) {
            errorCode = validationErrorCode
            errorResponse = optionalPrefix + key + ' should be an integer between ' + minLimit + ' and ' + maxLimit
        }
        return errorCode ? {errorCode: errorCode, errorResponse: errorResponse} : undefined
    },
    validateArray: function (inputArray, optionalPrefix) {
        optionalPrefix = optionalPrefix || ''
        var errorCode, errorResponse
        if (!Array.isArray(inputArray) || inputArray.length === 0) {
            errorCode = validationErrorCode
            errorResponse = optionalPrefix + 'should be an array with properties in it'
        }
        return errorCode ? {errorCode: errorCode, errorResponse: errorResponse} : undefined
    },
    validateObject: function (value, optionalPrefix) {
        optionalPrefix = optionalPrefix || ''
        var errorCode, errorResponse
        if (!(Object.prototype.toString.call(value) === '[object Object]')) {
            errorCode = validationErrorCode
            errorResponse = optionalPrefix + 'should be an Object'
        }
        return errorCode ? {errorCode: errorCode, errorResponse: errorResponse} : undefined
    },
    validateAssetName: function(assetName, optionalPrefix){
        optionalPrefix = optionalPrefix || ''
        var errorCode, errorResponse
        if (!(typeof  assetName === 'string')){
            errorCode = validationErrorCode
            errorResponse = optionalPrefix + 'assetName should be a string'
        }
        return errorCode ? {errorCode: errorCode, errorResponse: errorResponse} : undefined
    },
    validateIssueAssets: function (inputAssets) {
        var self = this
        var errorCodeAndResponse
        var inputAssetsReadyForAction = []
        var errorCodeAndResponse = self.validateArray(inputAssets);
        !errorCodeAndResponse && inputAssets.some(function validateAssetInput(asset, index) {
            errorCodeAndResponse = self.validateObject(asset, 'input assets at ' + index + ', ')
            if (!errorCodeAndResponse) errorCodeAndResponse = self.validateNumber('amount', asset.amount, 1, Math.pow(2, 54)-2 , 'input assets at ' + index + ', ')
            if (!errorCodeAndResponse) errorCodeAndResponse = self.validateAssetName(asset.assetName, 'input assets at ' + index + ', ')
            if (!errorCodeAndResponse) {
                inputAssetsReadyForAction.push({
                    amount: asset.amount,
                    metadata: {
                        assetName: asset.assetName
                    }
                })
            }
            if (errorCodeAndResponse) return true
        })
        return errorCodeAndResponse || inputAssetsReadyForAction
    },
    validateSendAsset: function (sendAssetProperties) {
        var errorCodeAndResponse = validations.validateObject(sendAssetProperties)
        if (!errorCodeAndResponse) {
            for (var key in sendAssetProperties) {
                if (errorCodeAndResponse) break
                var value = sendAssetProperties[key]
                switch (key) {
                    case 'toAddress':
                        errorCodeAndResponse = this.validateColuGeneratedString(key, value);
                        break
                    case 'assetId':
                        errorCodeAndResponse = this.validateColuGeneratedString(key, value);
                        break
                    case 'amount':
                        errorCodeAndResponse = this.validateNumber(key, value, 0, Math.pow(2, 54) - 2)
                        break
                    default:
                        break
                }
            }
        }
        return errorCodeAndResponse
    },
}

var processRequests = {
    coluCalls: {
        determineStatusAndResponse: function (err, results, sendResponse) {
            if (err) return sendResponse({code: err.code in statuses ? err.code : 500, response: err})
            return sendResponse({code: 200, response: results})
        },
        getAssets: function (colu, sendResponse) {
            var self = this
            async.waterfall(
                [
                    function (callback) {
                        colu.getAssets(function (err, assets) {
                            if (err) return callback(err)
                            var assetsIdsSet = new Set()
                            var assetsIds = [];
                            assets && assets.forEach(function (asset) {
                                var assetId = asset.assetId
                                if (!assetsIdsSet.has(assetId)) {
                                    assetsIdsSet.add(assetId)
                                    assetsIds.push({assetId:asset.assetId, address:asset.address})
                                }
                            });
                            return callback(null, assetsIds);
                        });
                    }
                ],
                function (err, results) {
                    return self.determineStatusAndResponse(err, results, sendResponse)
                }
            )
        },
        issueAssets: function (colu, inputAssets, sendResponse) {
            var response = validations.validateIssueAssets(inputAssets);
            if (response.errorCode) return sendResponse({code: response.errorCode, response: response.errorResponse})
            var inputAssetsReadyForAction = response;
            var issueAssetsAndPrepareResponse = []
            inputAssetsReadyForAction.forEach(function (assetToIssue, index) {
                var issueAndGetAssetMetadata = function (callback) {
                    colu.issueAsset(assetToIssue, function (err, assetObject) {
                        if (err) return callback(err)
                        return callback(null, assetObject.assetId)
                    })
                }
                issueAssetsAndPrepareResponse.push(issueAndGetAssetMetadata)
            })
            var finishedAll = function (err, results) {
                var response = []
                var code = 200
                results.forEach(function (result) {
                    if (result.value) {
                        response.push(result.value)
                    }
                    else {
                        code = result.error && result.error.code in statuses ? result.error.code : result.error && result.error.message && result.error.message.status in statuses ? result.error.message.status : 500
                        response.push(result.error)
                    }
                })
                return sendResponse({code: code, response: response})
            }
            async.parallel(
                async.reflectAll(issueAssetsAndPrepareResponse),
                finishedAll
            )
        },
        sendAsset: function (colu, addressAssetIdAndAmount, sendResponse) {
            var self = this
            var errorCodeAndResponse = validations.validateSendAsset(addressAssetIdAndAmount);
            if (errorCodeAndResponse) return sendResponse({code: errorCodeAndResponse.errorCode, response: errorCodeAndResponse.errorResponse})

            async.waterfall(
                [
                    function (callback) {
                        var localWalletAddresses = new Set()
                        colu.getAssets(function (err, assets) {
                            if (err) return callback(err)
                            var assetIdsInWallet = []
                            if (validations.validateArray(assets)) return callback('Should have from as array of addresses or sendutxo as array of utxos.')
                            assets.forEach(function(asset){
                                assetIdsInWallet.push(asset.assetId)
                            })
                            if(assetIdsInWallet.indexOf(addressAssetIdAndAmount.assetId) < 0) return callback('Should have from as array of addresses or sendutxo as array of utxos.')
                            assets.forEach(function (asset) {
                                localWalletAddresses.add(asset.address)
                            })
                            callback(null, localWalletAddresses)
                        })
                    },
                    function (localWalletAddresses, callback) {
                        colu.coloredCoins.getStakeHolders(addressAssetIdAndAmount.assetId, function (err, assetHolders) {
                            var assetsIdsAndAmounts = []
                            var from = [];
                            if (err) return callback(err)
                            if (validations.validateArray(assetHolders.holders)) return callback('Should have from as array of addresses or sendutxo as array of utxos.')
                            
                            var sumAllAmountsOfAssetInWallet = 0
                            assetHolders.holders.forEach(function (assetHolder) {
                                if (localWalletAddresses.has(assetHolder.address)) {
                                    sumAllAmountsOfAssetInWallet += assetHolder.amount
                                    from.push(assetHolder.address)
                                }
                            })
                            if (sumAllAmountsOfAssetInWallet < addressAssetIdAndAmount.amount) {
                                return callback({
                                    code: 20004,
                                    status: 500,
                                    name: 'NotEnoughAssetsError',
                                    message: 'Not enough assets to cover transfer transaction',
                                    asset: addressAssetIdAndAmount.assetId
                                })
                            }
                            callback(null, from)
                        })
                    },
                    function (from, callback) {
                        colu.coloredCoins.getAddressInfo(addressAssetIdAndAmount.toAddress, function (err, addressInfo) {
                            if (err) return callback(err)
                            if (!Array.isArray(addressInfo.utxos) || addressInfo.utxos.length === 0)
                                return callback({code: 500, response: 'toAddress does not exist'})
                            callback(null, from)
                        })
                    },
                    function (from, callback) {
                        var to = [{
                            address: addressAssetIdAndAmount.toAddress,
                            assetId: addressAssetIdAndAmount.assetId,
                            amount: addressAssetIdAndAmount.amount
                        }]
                        var args = {from: from, to: to};
                        colu.sendAsset(args, function (err, sentAsset) {
                            if (err) return callback(err)
                            return callback(null, sentAsset.txid)
                        })
                    }
                ],
                function (err, results) {
                    return self.determineStatusAndResponse(err, results, sendResponse)
                }
            )
        },
    },

    encoder: {
        signMantisExponentTable: {
            '0-31': {
                signBitsBinaryRepresentation: '000', mantisBits: 5, exponentBits: 0
            }
            ,
            '2': {
                signBitsBinaryRepresentation: '001', mantisBits: 9, exponentBits: 4
            }
            ,
            '5': {
                signBitsBinaryRepresentation: '010', mantisBits: 17, exponentBits: 4
            }
            ,
            '7': {
                signBitsBinaryRepresentation: '011', mantisBits: 25, exponentBits: 4
            }
            ,
            '10': {
                signBitsBinaryRepresentation: '100', mantisBits: 34, exponentBits: 3
            }
            ,
            '12': {
                signBitsBinaryRepresentation: '101', mantisBits: 42, exponentBits: 3
            }
            ,
            '16': {
                signBitsBinaryRepresentation: '11', mantisBits: 54, exponentBits: 0
            }
        },
        calculateMantisExponentDecimal: function (number) {
            if (number <= 31) {
                return {mantisDecimal: number, exponentDecimal: 0};
            }
            var exponentDecimal = 0;
            var mantisDecimal = number;
            
           
                while (mantisDecimal % 10 === 0) {
                    mantisDecimal /= 10;
                    exponentDecimal++;
                }
            if(mantisDecimal.toString().length > 12) {
                mantisDecimal = number
                exponentDecimal = 0
            }
            return {mantisDecimal: mantisDecimal, exponentDecimal: exponentDecimal};
        },
        significantDigitsInTable: function (mantisDecimal, number) {
            if (mantisDecimal <= 31 && number <= 31) {
                return '0-31';
            }
            else if (mantisDecimal.toString().length === 1) {
                return '2';
            }
            else {
                var significantDigits = mantisDecimal.toString().length;
                while (!this.signMantisExponentTable[significantDigits]) {
                    significantDigits++;
                }
                return significantDigits.toString();
            }
        },
        appendZerosToPrefix: function (number, bits) {
            if (bits === 0) {
                return '';
            }
            var numberString = number.toString();
            var numberCurrentBits = numberString.length;
            while (numberString.length < bits) {
                numberString = '0'.concat(numberString);
            }
            return numberString;
        },
        bin2hex: function (fullBinaryReperesentation) {
            var binarySeperatedToQuadrupvars = fullBinaryReperesentation.match(/.{1,4}/g);
            var fullHexRepresentation = '';
            binarySeperatedToQuadrupvars.forEach(function (quadruplet, index) {
                fullHexRepresentation += parseInt(quadruplet, 2).toString(16);

            });
            return fullHexRepresentation;
        },
        encodeNumber: function (number) {
            var mantisAndExponentDecimal = this.calculateMantisExponentDecimal(number);
            var mantisDecimal = mantisAndExponentDecimal.mantisDecimal;
            var exponentDecimal = mantisAndExponentDecimal.exponentDecimal;

            var mantisBinaryWithoutZeros = mantisDecimal.toString(2);
            var exponentBinaryWithNumberOfBits = exponentDecimal.toString(2);
            var significantDigits = this.significantDigitsInTable(mantisDecimal, number).toString();

            var mantisBits = this.signMantisExponentTable[significantDigits].mantisBits;
            var exponentBits = this.signMantisExponentTable[significantDigits].exponentBits;
            var signBinaryRepresentation = this.signMantisExponentTable[significantDigits].signBitsBinaryRepresentation;
            var mantisBinaryRepresenation = this.appendZerosToPrefix(mantisBinaryWithoutZeros, mantisBits);
            var exponentBinaryRepresenatation = this.appendZerosToPrefix(exponentBinaryWithNumberOfBits, exponentBits);

            var fullBinaryReperesentation = signBinaryRepresentation += mantisBinaryRepresenation += exponentBinaryRepresenatation;
            var fullHexRepresentation = this.bin2hex(fullBinaryReperesentation);
            return fullHexRepresentation
        },
        encode: function (number, sendResponse) {
            var errorCodeAndResponse = validations.validateNumber('number', number, 0, Number.MAX_SAFE_INTEGER)
            if (!errorCodeAndResponse) {
                var response = this.encodeNumber(parseInt(number))
                return sendResponse({code: 200, response: response})
            }
            return sendResponse({code: errorCodeAndResponse.errorCode, response: errorCodeAndResponse.errorResponse})
        },
    }
}
module.exports.processRequests = processRequests
module.exports.validations = validations

