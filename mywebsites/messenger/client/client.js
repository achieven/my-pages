import React from 'react'
import io from '../../../node_modules/socket.io-client/socket.io.js'
var socket = io('/messengerReact')
const $ = require('../../.././node_modules/jquery/dist/jquery.min.js')

function escapeUnescapeHtml(text) {
    text = text.split('<').join('&lt')
    text = text.split('>').join('&gt')
    return text
}


var Client = React.createClass({
    propTypes: {},
    getInitialState: function () {
        return null
    },
    compoentWillMount: function () {

    },
    componentWillUpdate: function () {

    },
    componentWillUnmount: function () {

    },
    shouldComponentUpdate: function () {

    },
    componentWillReceiveProps: function () {

    },
    handleIncomingMessage: function (data, whoSent) {
        switch (whoSent) {
            case 'other':
                $('.messages').append('<span class="form-control alert alert-success" style="display:inline;  left:0;">' + 'Someone wrote: ' +  escapeUnescapeHtml(data) + '</span><p style="padding-bottom: 15px;"></p>')
                break
            case 'me':
                $('.messages').append('<span class="form-control alert alert-info" style="display:inline;  right: 0">' + 'You wrote: ' + escapeUnescapeHtml(data) + '</span><p style="padding-bottom: 15px;"></p>')
                break
            default:
                break

        }

    },
    render: function () {
        return (
            <div>
                <div className="container">
                    <div className="messages">
                    </div>
                    <form id="message">
                        <div className="form-group">
                            <div className="row">
                                <div className="col-xs-10">
                                    <input className="form-control" type='text' placeholder='message'/>
                                </div>
                                <div className="col-xs-2">
                                    <button className="btn btn-default" type='submit'>Submit</button>
                                </div>
                            </div>
                        </div>
                        <div className="row col-xs-12 serverMessage"></div>
                    </form >
                </div>

                <script src="../../.././node_modules/bootstrap/dist/js/bootstrap.min.js"></script>
                <link rel="stylesheet" href="../../.././node_modules/bootstrap/dist/css/bootstrap.min.css"/>
            </div>

        )
    },

    componentDidMount: function () {
        var thisComponent = this
        socket.on('serverMessageToOther', function (data) {
            thisComponent.handleIncomingMessage(data, 'other')
        })
        socket.on('serverMessageToMe', function (data) {
            thisComponent.handleIncomingMessage(data, 'me')
        })
        $('#message').on('submit', function (e) {
            e.preventDefault()
            socket.removeAllListeners('serverMessage');
            socket.emit('clientMessage', $('#message :input').val())
        })
        $('.loadingMessage').addClass('hide')
        $.get("http://ipinfo.io", function (response) {
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
    componentDidUpdate: function () {

    }
})

module.exports = Client