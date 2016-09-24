define([], function(){
    'use strict'
    const signMantisExponentTable = {
        '0-31': {signBitsBinaryRepresentation: '000', mantisBits: 5, exponentBits: 0},
        '2': {signBitsBinaryRepresentation: '001', mantisBits: 9, exponentBits: 4},
        '5': {signBitsBinaryRepresentation: '010', mantisBits: 17, exponentBits: 4},
        '7': {signBitsBinaryRepresentation: '011', mantisBits: 25, exponentBits: 4},
        '10': {signBitsBinaryRepresentation: '100', mantisBits: 34, exponentBits: 3},
        '12': {signBitsBinaryRepresentation: '101', mantisBits: 42, exponentBits: 3},
        '16': {signBitsBinaryRepresentation: '110', mantisBits: 53, exponentBits: 0}
    };
    let Util = {
        calculateMantisExponentDecimal: function (number) {
            if(number <= 31){
                return {mantisDecimal: number, exponentDecimal: 0};
            }
            let exponentDecimal = 0;
            let mantisDecimal = number;
            while (mantisDecimal % 10 === 0) {
                mantisDecimal /= 10;
                exponentDecimal++;
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
                let significantDigits = mantisDecimal.toString().length;
                while (!signMantisExponentTable[significantDigits]) {
                    significantDigits++;
                }
                return significantDigits.toString();
            }
        },
        appendZerosToPrefix: function (number, bits) {
            if (bits === 0) {
                return '';
            }
            let numberString = number.toString();
            let numberCurrentBits = numberString.length;
            while (numberString.length < bits) {
                numberString = '0'.concat(numberString);
            }
            return numberString;
        },
        encodeNumber: function (number) {
            let mantisAndExponentDecimal = this.calculateMantisExponentDecimal(number);
            let mantisDecimal = mantisAndExponentDecimal.mantisDecimal;
            let exponentDecimal = mantisAndExponentDecimal.exponentDecimal;

            let mantisBinaryWithoutZeros = mantisDecimal.toString(2);
            let exponentBinaryWithNumberOfBits = exponentDecimal.toString(2);
            let significantDigits = this.significantDigitsInTable(mantisDecimal, number).toString();

            let mantisBits = signMantisExponentTable[significantDigits].mantisBits;
            let exponentBits = signMantisExponentTable[significantDigits].exponentBits;
            let signBinaryRepresentation = signMantisExponentTable[significantDigits].signBitsBinaryRepresentation;
            let mantisBinaryRepresenation = this.appendZerosToPrefix(mantisBinaryWithoutZeros, mantisBits);
            let exponentBinaryRepresenatation = this.appendZerosToPrefix(exponentBinaryWithNumberOfBits, exponentBits);

            let fullBinaryReperesentation = signBinaryRepresentation += mantisBinaryRepresenation += exponentBinaryRepresenatation;
            let fullHexRepresentation = parseInt(fullBinaryReperesentation, 2).toString(16);
            return fullHexRepresentation;
        },
        generateJson: function () {
            const ceilingNumber = 9999999999;
            let random = Math.floor(Math.random() * (ceilingNumber+1));
            let jsonObjectToEmit = {
                timestamp: Date.now(),
                number: random,
                encodedNumber: this.encodeNumber(random)
            };
            return jsonObjectToEmit;
        }
    }
    return Util;
});


