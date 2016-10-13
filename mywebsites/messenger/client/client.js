import React from 'react'
import io from '../../../node_modules/socket.io-client/socket.io'
var socket = io('/messengerReact')
const $ = require('../../.././node_modules/jquery/dist/jquery.min.js')
var clientComponent, loginComponent, chatComponent
var Ladda = require('ladda')

function escapeUnescapeHtml(text) {
    text = text.split('<').join('&lt')
    text = text.split('>').join('&gt')
    return text
}

var LoginPage = React.createClass({
    render: function () {
        return (
            <div className="container">
                <h4 className="row col-xs-12"></h4>
                <div className="row">
                    <div className="col-xs-3">
                        <form className="loginForm">
                            <div className="row">
                                <label>Username</label>
                                <input type="text" className="col-xs-6 form-control usernameLogin"/>
                            </div>
                            <div className="row">
                                <label>Password</label>
                                <input type="password" className="col-xs-6 form-control passwordLogin"/>
                            </div>
                            <h4 className="row col-xs-12"></h4>
                            <h5 className="loginError hide row col-xs-12">No such username and password</h5>
                            <button className="btn btn-success row col-xs-12" type='submit'>Login</button>
                        </form>
                    </div>
                    <div className="col-xs-3"></div>
                    <div className="col-xs-3">
                        <form className="signupForm">
                            <div className="row">
                                <label>Username</label>
                                <input type="text" className="col-xs-9 form-control usernameSignup"/>
                            </div>
                            <div className="row">
                                <label>Password</label>
                                <input type="password" className="col-xs-9 form-control passwordSignup1"/>
                            </div>
                            <div className="row">
                                <label>Re-enter Password</label>
                                <input type="password" className="col-xs-9 form-control passwordSignup2"/>
                            </div>
                            <h4 className="row col-xs-12"></h4>
                            <h5 className="signupError row col-xs-12"></h5>
                            <button className="btn btn-success row col-xs-12" type='submit'>Sign Up</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    },
    componentDidMount: function () {
        loginComponent = this
    },
    finishPage: function () {
        $('.loginForm').addClass('hide')
        $('.signupForm').addClass('hide')
    }
})

var MessageLine = React.createClass({
    getInitialState: function () {
        return {
            color: this.props.color || '',
            sender: this.props.sender || '',
            message: this.props.message || ''
        }
    },

    render: function () {
        var classname = "alert " + this.props.color
        var messageText = this.props.sender + ': ' + this.props.message
        return (
            <tr>
                <td className={classname}>
                    <p className="messageSender">{this.props.sender}</p>
                    <h6 className="messageText">{this.props.message}</h6>
                </td>
            </tr>
        )
    }
})

var ChatPage = React.createClass({
    colors: {
        me: 'alert-info',
        others: [
            'alert-danger',
            'alert-success',
            'alert-warning'
        ]
    },
    messageKey: 0,
    getInitialState: function () {
        return {
            username: this.props.username || '',
            messages: this.props.messages || []
        }
    },
    startChat: function (username) {
        socket.emit('getCorrespondence', username)
        socket.removeAllListeners('showCorrespondence')
        socket.on('showCorrespondence', function (messages) {
            chatComponent.setState({
                messages: messages
            })
        })
        $('.chatPage').removeClass('hide')
        this.listenToUserMessages()
        $('.messageForm').on('submit', function (e) {
            e.preventDefault()
            var message = $('.messageForm :input').val()
            message && socket.emit('clientMessage', {message: message, sender: username})
            $('.messageForm')[0].reset()

        })
        $('.saveCorrespondence').on('click', function (e) {
            $('.saveCorrespondence .ladda-spinner').removeClass('hide')
            var laddaSaveChat = Ladda.create(document.querySelector('.saveCorrespondence'))
            laddaSaveChat.start()
            e.preventDefault()
            socket.emit('saveCorrespondence', {
                username: chatComponent.state.username,
                messages: chatComponent.state.messages
            })
            socket.removeAllListeners('correspondenceSaved')
            socket.on('correspondenceSaved', function () {
                laddaSaveChat.stop()
                $('.saveCorrespondence').removeClass('ladda-button')
                $('.saveCorrespondence .ladda-spinner').addClass('hide')
                $('.chatSavedMessage').removeClass('hide')
                setTimeout(function () {
                    $('.chatSavedMessage').addClass('hide')
                }, 2000)
            })
        })
        $('.deleteCorrespondence').on('click', function (e) {
            e.preventDefault()
            $('.deleteCorrespondenceWarning').removeClass('hide')
            $('.yesDeleteCorrespondence').on('click', function (e) {
                e.preventDefault()
                socket.emit('deleteCorrespondence', chatComponent.state.username)
                socket.on('correspondenceDeleted', function (data) {
                    $('.deleteCorrespondenceWarning').addClass('hide')
                    chatComponent.setState({
                        messages: []
                    })
                })
            })
            $('.noDontDeleteCorrespondence').on('click', function (e) {
                e.preventDefault()
                $('.deleteCorrespondenceWarning').addClass('hide')
            })
        })
        this.setState({
            username: username
        })
    },
    listenToUserMessages: function () {
        var thisComponent = this
        socket.removeAllListeners('serverMessageToOther')
        socket.removeAllListeners('serverMessageToMe')
        socket.on('serverMessageToOther', function (data) {
            thisComponent.handleIncomingMessage(data.message, data.sender, data.socketId)
        })
        socket.on('serverMessageToMe', function (data) {
            thisComponent.handleIncomingMessage(data.message, data.sender)
        })
    },
    handleIncomingMessage: function (message, sender, socketId) {
        var messages = this.updateStateWithoutRendering(message, sender, socketId)
        this.setState({
            messages: messages
        })
    },
    updateStateWithoutRendering: function (message, sender, socketId) {
        var messages = this.state.messages
        messages.push({message: message, sender: sender, socketId: socketId})
        return messages
    },
    buildMessagesToRender: function () {
        var messagesDomElements = []
        this.state.messages.forEach(function (data) {
            var color = data.sender === window.sessionStorage.getItem('chatUserName') ? chatComponent.colors.me : chatComponent.colors.others[(data.socketId) % (chatComponent.colors.others.length)]
            var sender = data.sender === window.sessionStorage.getItem('chatUserName') ? '' : data.sender
            messagesDomElements.push(
                <MessageLine key={chatComponent.messageKey++} message={data.message} sender={sender}
                             color={color}></MessageLine>
            )
        })
        return messagesDomElements
    },
    render: function () {
        var messages = this.buildMessagesToRender()
        return (
            <div className="chatPage hide">
                <div className="chatTop">
                    <div className="container">
                        <div className="row">
                            <div className="col-sm-8 col-xs-4">
                                <h3 className="helloUsername">Hello {this.state.username}!</h3>
                            </div>
                            <div className="col-sm-4 col-xs-8">
                                <div className="row">
                                    <div className="col-xs-6">
                                        <button className="btn btn-info col-xs-12 saveCorrespondence"
                                                data-style="zoom-in" type='submit'>
                                            <span className="ladda-label">Save Chat</span>
                                            <span className="ladda-spinner"></span>
                                        </button>
                                        <h5 className="chatSavedMessage text-center hide">Chat Saved!</h5>
                                    </div>
                                    <div className="col-xs-6">
                                        <button className="btn btn-danger col-xs-12 deleteCorrespondence">Delete
                                            Chat
                                        </button>
                                        <div className="deleteCorrespondenceWarning text-center hide">
                                            <h4 className="row col-xs-12"></h4>
                                            <div className="row col-xs-12 alert alert-warning">
                                                Are you sure you want to delete this chat? This is an irreversible step!
                                            </div>
                                            <div className="row col-xs-12">
                                                <button className="btn btn-warning yesDeleteCorrespondence"
                                                        type="button">Yes
                                                </button>
                                                <button className="btn btn-info noDontDeleteCorrespondence"
                                                        type="button">No
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="chatBody">
                    <div className="container">
                        <div className="row col-sm-9 col-xs-8 chatTable">
                            <table className="table">
                                <tbody>
                                {messages || []}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="chatBottom">
                    <div className="container">
                        <div className="row">
                            <form className="messageForm">
                                <div className="col-xs-9">
                                    <div className="form-group">
                                        <input className="form-control" type='text' placeholder='message'/>
                                    </div>
                                </div>
                                <div className="col-xs-3 text-right">
                                    <button className="btn btn-success row col-xs-12" type='submit'>Submit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

        )

    },
    componentDidMount: function () {
        chatComponent = this
    }
})

var Client = React.createClass({
    render: function () {
        return (
            <div>
                <script src="../../.././node_modules/bootstrap/dist/js/bootstrap.min.js"></script>
                <link rel="stylesheet" href="../../.././node_modules/bootstrap/dist/css/bootstrap.min.css"/>
                <script src="../../../node_modules/socket.io-client/socket.io.js"></script>
                <script src="./node_modules/ladda/dist/spin.min.js  "></script>
                <script src="./node_modules/ladda/dist/ladda.min.js"></script>
                <link rel="stylesheet" href="./node_modules/ladda/dist/ladda.min.css"/>
                <link href="../../../assets/css/messenger.css" rel="stylesheet"/>
                <LoginPage></LoginPage>
                <ChatPage></ChatPage>
            </div>

        )
    },
    navigateToChatPage: function (username) {
        window.sessionStorage.setItem('chatUserName', username)
        chatComponent.startChat(username)
        loginComponent.finishPage()
    },
    componentDidMount: function () {
        clientComponent = this
        // if(window.sessionStorage.getItem('chatUserName'){
        //     clientComponent.navigateToChatPage(window.sessionStorage.getItem('chatUserName'))
        // }
        $('.loadingMessage').addClass('hide')
        var deviceInputClass, deviceButtonClass
        if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
            deviceInputClass = 'lg'
            deviceButtonClass = 'lg'
        }
        else {
            deviceInputClass = 'xs'
            deviceButtonClass = 'md'
        }
        $('button').addClass('btn-' + deviceButtonClass)
        $('input').addClass('input-' + deviceInputClass)
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

        $('.loginForm').on('submit', function (e) {
            var data = {
                username: $('.usernameLogin').val(),
                password: $('.passwordLogin').val()
            }
            e.preventDefault()
            socket.emit('login', data)
            socket.removeAllListeners('loginSuccess')
            socket.removeAllListeners('loginFail')
            socket.on('loginSuccess', function (username) {
                clientComponent.navigateToChatPage(username);
            })
            socket.on('loginFail', function () {
                $('.loginError').removeClass('hide')
            })
        })
        $('.signupForm').on('submit', function (e) {
            e.preventDefault()
            if ($('.passwordSignup1').val() != $('.passwordSignup2').val()) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Passwords dont match')
            }
            else {
                var data = {
                    username: $('.usernameSignup').val(),
                    password: $('.passwordSignup1').val()
                }
                socket.emit('signup', data)
                socket.removeAllListeners('signupSuccess')
                socket.on('signupSuccess', function (username) {
                    clientComponent.navigateToChatPage(username);
                })
                socket.on('signupFail', function (username) {
                    $('.signupError').removeClass('hide')
                    $('.signupError').text('Username ' + username + ' is not available')
                })
            }
        })

    }
})

module.exports = Client


