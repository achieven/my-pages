'use strict';
const React = require('react');
let emitterUtil = require('./emitterUtil')
let tickerComponent, chartComponent;
let emitFrequency, throttleBufferSize;
const maxRendersPerSecond = 2;

let Form = React.createClass({
    render: function () {
        return (
            <div>
                <h2 className="loadingMessage">Please wait while page is being loaded...</h2>
                <div className="form hide">
                    <form id="emitFrequencyForm">
                        <div className="form-group">
                            <div className="row">
                                <div className="col-sm-4 col-xs-8">
                                    <label className="insertFrequency"> Insert Emit Frequency Here:</label>
                                    <input className="form-control" type='number'
                                           placeholder='use only positive integers'/>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-sm-4 col-xs-8">
                                <button className="btn btn-default col-xs-12" type='submit'>Change emit frequency
                                </button>
                            </div>
                        </div>
                    </form >
                </div>
            </div>
        );
    }
});

let Number = React.createClass({
    propTypes: {
        number: React.PropTypes.number,
        encodedNumber: React.PropTypes.string
    },
    render: function () {
        return (
            <tr>
                <td>Number: {this.props.number}, Encoded Number: {this.props.encodedNumber}</td>
            </tr>
        );
    }
});

let Ticker = React.createClass({
    propTypes: {
        last20Numbers: React.PropTypes.array
    },
    getInitialState: function () {
        tickerComponent = this;
        this.elementsInsideBuffer = 0;
        return {
            last20Numbers: (this.props.last20Numbers || []),
            numberOfIncomingEmits: (this.props.numberOfIncomingEmits || 0)
        };
    },
    handleIncomingEmit: function (data) {
        let last20Numbers = emitterUtil.ticker.updateStateWithoutRendering.call(this, data);
        this.elementsInsideBuffer++;
        this.setState({
            last20Numbers: last20Numbers,
            numberOfIncomingEmits: this.state.numberOfIncomingEmits + 1
        });
    },
    shouldComponentUpdate: function () {
        return this.elementsInsideBuffer >= throttleBufferSize;
    },
    buildNumbersToRender: function () {
        let last20NumbersDomElements = [];
        let thisComponent = this;
        this.state.last20Numbers.forEach(function (data) {
            let uniqueChildKey = data.timestamp.toString() + thisComponent.state.numberOfIncomingEmits;
            last20NumbersDomElements.push(
                <Number key={uniqueChildKey} number={data.number} encodedNumber={data.encodedNumber}/>
            );
        });
        return last20NumbersDomElements;
    },
    render: function () {
        this.last20NumbersDomElements = this.buildNumbersToRender();
        return (
            <table className="table">
                <tbody>
                {this.last20NumbersDomElements || []}
                </tbody>
            </table>
        );
    },
    componentDidUpdate: function () {
        this.elementsInsideBuffer = 0;
    },
});

let Chart = React.createClass({
    propTypes: {
        last100Timestamps: React.PropTypes.arrayOf(React.PropTypes.number),
        last100Numbers: React.PropTypes.arrayOf(React.PropTypes.arrayOf(React.PropTypes.number))
    },
    getInitialState: function () {
        chartComponent = this;
        this.elementsInsideBuffer = 0;
        return {
            last100Timestamps: (this.props.last100Timestamps || []),
            last100Numbers: (this.props.last100Numbers || [[]])
        };
    },
    handleIncomingEmit: function (data) {
        let last100Data = emitterUtil.chart.updateStateWithoutRendering.call(this, data);
        this.elementsInsideBuffer++;
        this.setState({
            last100Timestamps: last100Data.last100Timestamps,
            last100Numbers: last100Data.last100Numbers
        });
    },
    shouldComponentUpdate: function () {
        return this.elementsInsideBuffer >= throttleBufferSize;
    },
    render: function () {
        return (<div className="chart"></div>);
    },
    componentDidUpdate: function () {
        this.elementsInsideBuffer = 0;
        new Chartist.Line(
            '.chart',
            {
                labels: this.state.last100Timestamps,
                series: this.state.last100Numbers
            }
        );
    }
});

let Emitter = React.createClass({
    propTypes: {
        ticker: React.PropTypes.array,
        chart: React.PropTypes.object
    },
    getInitialState: function () {
        return {
            ticker: (this.props.ticker || []),
            chart: (this.props.chart || {timestamps: [], numbers: [[]]})
        };
    },
    componentDidMount: function () {
        $('body').attr('style', "background-image: url(../../../assets/images/emitter_background.png);")
        let socket = io.connect('/emitterPage', {secure: true});
        $('#emitFrequencyForm').submit(function (event) {
            event.preventDefault();
            if ($('#emitFrequencyForm :input').val() > 0) {
                emitFrequency = $('#emitFrequencyForm :input').val();
                throttleBufferSize = emitFrequency / maxRendersPerSecond;
                socket.removeAllListeners('/showEmittedJson');
                socket.emit('/startEmitter', {emitFrequency: emitFrequency});
                socket.on('/showEmittedJson', function (data) {
                    tickerComponent.handleIncomingEmit(data);
                    chartComponent.handleIncomingEmit(data);
                });
            }
        });
        $('.loadingMessage').addClass('hide')
        $('.form').removeClass('hide')
        $.get("https://ipinfo.io", function (response) {
            var data = {
                ipAddress: response.ip,
                hostname: response.hostname,
                country: response.country,
                city: response.city,
                loc: response.loc,
                org: response.org,
                region: response.region
            }
            $.ajax({
                type: 'post',
                url: '/userDetails/userdata',
                data: JSON.stringify(data),
                contentType: 'application/json'
            })
        }, "jsonp")
    },
    render: function () {
        return (
            <div>
                <div className="container">
                    <Form ></Form>
                    <Ticker last20Numbers={this.props.ticker} numberOfIncomingEmits={0}></Ticker>
                    <Chart last100Timestamps={this.props.chart.timestamps}
                           last100Numbers={this.props.chart.numbers}>
                    </Chart>
                </div>
                <script src="../.././node_modules/socket.io-client/socket.io.js"></script>
                <script src="../.././node_modules/jquery/dist/jquery.min.js"></script>
                <script src="../.././node_modules/bootstrap/dist/js/bootstrap.min.js"></script>
                <link rel="stylesheet" href="../.././node_modules/bootstrap/dist/css/bootstrap.min.css"/>
                <script src="../.././node_modules/chartist/dist/chartist.min.js"></script>
                <link rel="stylesheet" href="../.././node_modules/chartist/dist/chartist.min.css"/>
                <script src="./.././node_modules/requirejs/require.js"></script>
                <script src="/bundle.js"></script>
            </div>
        )
    },
});
module.exports = Emitter;
