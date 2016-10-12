var util = require('../../mywebsites/emitter/client/emitterUtil')
const expect = require('chai').expect
describe('Ticker updateStateWithoutRendering', function () {
    var Ticker = function (options) {
        this.state = options.state;
    };
    var last20Numbers = [];
    for (var i = 0; i < 19; i++) {
        last20Numbers.push({
            timestamp: i,
            number: i,
            encodedNumber: i
        });
    }
    var myComponent = new Ticker({
        state: {
            last20Numbers: last20Numbers
        }
    });
    it('should add one number object to state when length is smaller than 20', function () {
        var newLast20Numbers = util.ticker.updateStateWithoutRendering.call(myComponent, {
            timestamp: 19,
            number: 19,
            encodedNumber: 19
        });
        expect(newLast20Numbers.length).to.be.equal(20);
        newLast20Numbers.forEach(function (number, index) {
            expect(number.timestamp).to.be.equal(index);
            expect(number.number).to.be.equal(index);
            expect(number.encodedNumber).to.be.equal(index);
        });
    });
    it('should shift array so that first number inserted is out and a new number is inserted', function () {
        myComponent.state.last20Numbers.push({
            timestamp: 19,
            number: 19,
            encodedNumber: 19
        });
        var newLast20Numbers = util.ticker.updateStateWithoutRendering.call(myComponent, {
            timestamp: 20,
            number: 20,
            encodedNumber: 20
        });
        expect(newLast20Numbers.length).to.be.equal(20);
        newLast20Numbers.forEach(function (number, index) {
            expect(number.timestamp).to.be.equal(index + 1);
            expect(number.number).to.be.equal(index + 1);
            expect(number.encodedNumber).to.be.equal(index + 1);
        });
    });
});
describe('Chart updateStateWithoutRendering', function () {
    var Chart = function (options) {
        this.state = options.state;
    };
    var last100Timestamps = [];
    var last100Numbers = [[]];
    for (var i = 0; i < 99; i++) {
        last100Timestamps.push(i);
        last100Numbers[0].push(i);
    }
    var myComponent = new Chart({
        state: {
            last100Timestamps: last100Timestamps,
            last100Numbers: last100Numbers
        }
    });
    it('should add one timestamp and one number to state when length is smaller than 100', function () {
        var newLast100Data = util.chart.updateStateWithoutRendering.call(myComponent, {
            timestamp: 99,
            number: 99
        });
        expect(newLast100Data.last100Timestamps.length).to.be.equal(100);
        expect(newLast100Data.last100Numbers[0].length).to.be.equal(100);
        newLast100Data.last100Timestamps.forEach(function (timestamp, index) {
            expect(timestamp).to.be.equal(index);
        });
        newLast100Data.last100Numbers[0].forEach(function (timestamp, index) {
            expect(timestamp).to.be.equal(index);
        });
    });
    it('should shift array so that first timestamp and number inserted are out and a new timestamp and number are inserted', function () {
        myComponent.state.last100Timestamps.push(99);
        myComponent.state.last100Numbers[0].push(99);
        var newLast100Data = util.chart.updateStateWithoutRendering.call(myComponent, {
            timestamp: 100,
            number: 100
        });
        expect(newLast100Data.last100Timestamps.length).to.be.equal(100);
        expect(newLast100Data.last100Numbers[0].length).to.be.equal(100);
        newLast100Data.last100Timestamps.forEach(function (timestamp, index) {
            expect(timestamp).to.be.equal(index + 1);
        });
        newLast100Data.last100Numbers[0].forEach(function (timestamp, index) {
            expect(timestamp).to.be.equal(index + 1);
        })
    });
})
