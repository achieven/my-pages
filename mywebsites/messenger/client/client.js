import React from 'react'
import io from '../../../node_modules/socket.io-client/socket.io'
var socket = io('/messengerReact')
const $ = require('../../.././node_modules/jquery/dist/jquery.min.js')
var clientComponent, loginAsComponent, loginSignupComponent, chatComponent
var Ladda = require('ladda')

function escapeUnescapeHtml(text) {
    text = text.split('<').join('&lt')
    text = text.split('>').join('&gt')
    return text
}

var LoginAsPage = React.createClass({
    start: function (username) {
        $('.loginAs').removeClass('hide')
        $('.yesLoginAs').on('click', function () {
            socket.emit('loginAs', username)
            clientComponent.setUsernameStorage(username);
            clientComponent.navigateToChatPage(username, 'loginAs')
        })
        $('.noDontLoginAs').on('click', function () {
            clientComponent.navigateToLoginSignupPage()
        })
    },
    render: function () {
        return (
            <div className="loginAs hide">
                <div className="container">
                    <div className="row">
                        <div className="col-sm-3 col-xs-12 text-center">
                            <h3 className="alert alert-warning">Login
                                as {window.localStorage.getItem('chatUserName')}?</h3>
                            <div className="positionRelative">
                                <button className="btn btn-success yesLoginAs yesButton">Yes</button>
                                <button className="btn btn-info noDontLoginAs noButton">No</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    componentDidMount: function () {
        loginAsComponent = this
    },
    finish: function () {
        $('.loginAs').addClass('hide')
    }
})

var LoginSignupPage = React.createClass({
    start: function () {
        $('.loginSignupPage').removeClass('hide')
        loginSignupComponent.submitLoginForm();
        loginSignupComponent.submitSignupForm();
    },
    render: function () {
        return (
            <div className="loginSignupPage hide">
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
            </div>
        )
    },
    submitLoginForm: function () {
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
                clientComponent.setUsernameStorage(username);
                clientComponent.navigateToChatPage(username, 'loginSignup');
            })
            socket.on('loginFail', function () {
                $('.loginError').removeClass('hide')
            })
        })
    },
    submitSignupForm: function () {
        $('.signupForm').on('submit', function (e) {
            e.preventDefault()
            var usernameSignup = $('.usernameSignup').val()
            var passwordSignup1 = $('.passwordSignup1').val()
            var passwordSignup2 = $('.passwordSignup2').val()
            if (usernameSignup.length < 8 || usernameSignup.length > 15) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Username must be between 8 and 15 letters')
            }
            else if (usernameSignup.indexOf('#') > -1) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Character # is not allowed in username')
            }
            else if (passwordSignup1 != passwordSignup2) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Passwords dont match')
            }
            else if (passwordSignup1.length < 8) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Password must be at least 8 characters')
            }
            else {
                var data = {
                    username: passwordSignup1,
                    password: passwordSignup2
                }
                socket.emit('signup', data)
                socket.removeAllListeners('signupSuccess')
                socket.on('signupSuccess', function (username) {
                    clientComponent.setUsernameStorage(username)
                    clientComponent.navigateToChatPage(username, 'loginSignup');
                })
                socket.on('signupFail', function (username) {
                    $('.signupError').removeClass('hide')
                    $('.signupError').text('Username ' + username + ' is not available')
                })
            }
        })
    },
    componentDidMount: function () {
        loginSignupComponent = this
    },
    finish: function () {
        $('.loginSignupPage').addClass('hide')
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


var OnlineUserLine = React.createClass({
    getInitialState: function () {
        return {
            user: this.props.user || '',
            button: this.props.button || ''
        }
    },
    render: function () {
        var className = "messageText btn btn-" + this.props.button
        return (
            <tr>
                <td className="alert alert-info">
                    <button className={className}>{this.props.user}</button>
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
            otherUsername: this.props.otherUsername || '',
            messages: this.props.messages || [],
            onlineUsers: this.props.onlineUsers || []
        }
    },
    start: function (username) {
        $('.chatPage').removeClass('hide')
        this.showCorrespondence(username);
        this.showOnlineUsers()
        this.listenToUserMessages()
        this.waitForMessageSubmit(username);
        this.waitForChatSave();
        this.waitForChatDelete();
        this.setState({
            username: username
        })
    },
    waitForMessageSubmit: function (username) {
        $('.messageForm').on('submit', function (e) {
            e.preventDefault()
            var message = $('.messageForm :input').val()
            message && socket.emit('clientMessage', {message: message, sender: username})
            $('.messageForm')[0].reset()
        })
    },
    waitForChatSave: function () {
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
    },
    waitForChatDelete: function () {
        $('.deleteCorrespondence').on('click', function (e) {
            e.preventDefault()
            chatComponent.scrollToBottom()
            $('.deleteCorrespondenceWarning').removeClass('hide')
            $('.yesDeleteCorrespondence').on('click', function (e) {
                e.preventDefault()
                socket.emit('deleteCorrespondence', chatComponent.state.username)
                socket.removeAllListeners('correspondenceDeleted')
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
    },
    waitForPrivateChatClick: function () {
        $('.messageText').unbind('click').click(function (e) {
            var userToSend = e.currentTarget.textContent
            socket.emit('openPrivateChat', {from: clientComponent.getUsernameStorage(), to: userToSend})
            socket.removeAllListeners('showPrivateChat')
            socket.on('showPrivateChat', function(messages){
                chatComponent.setState({
                    messages:messages,
                    otherUsername: userToSend
                })
            })
        })
    },
    showOnlineUsers: function () {
        socket.emit('getOnlineUsers')
        socket.removeAllListeners('showOnlineUsers')
        socket.on('showOnlineUsers', function (onlineUsers) {
            var indexOfMe = onlineUsers.findIndex(function (user) {
                return user === clientComponent.getUsernameStorage()
            })
            onlineUsers.splice(indexOfMe, 1)
            chatComponent.setState({
                onlineUsers: onlineUsers
            })
        })
    },
    showCorrespondence: function (username) {
        socket.emit('getCorrespondence', username)
        socket.removeAllListeners('showCorrespondence')
        socket.on('showCorrespondence', function (messages) {
            chatComponent.setState({
                messages: messages
            })
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
            var color, sender
            if (window.localStorage.getItem('env') === 'dev') {
                color = data.sender === window.sessionStorage.getItem('chatUserName') ? chatComponent.colors.me : chatComponent.colors.others[(data.socketId) % (chatComponent.colors.others.length)]
                sender = data.sender === window.sessionStorage.getItem('chatUserName') ? '' : data.sender
            }
            else {
                color = data.sender === window.localStorage.getItem('chatUserName') ? chatComponent.colors.me : chatComponent.colors.others[(data.socketId) % (chatComponent.colors.others.length)]
                sender = data.sender === window.localStorage.getItem('chatUserName') ? '' : data.sender
            }

            messagesDomElements.push(
                <MessageLine key={chatComponent.messageKey++} message={data.message} sender={sender}
                             color={color}></MessageLine>
            )
        })
        return messagesDomElements
    },
    buildOnlineUsersToRender: function () {
        var onlineUsersDomElements = []
        var onlineUserKey = 0
        this.state.onlineUsers.forEach(function (user) {
            if(!chatComponent){
                onlineUsersDomElements.push(<OnlineUserLine key={onlineUserKey++} user={user} button="default"></OnlineUserLine>)
            }
            else if(chatComponent.state.otherUsername === user){
                onlineUsersDomElements.push(<OnlineUserLine key={onlineUserKey++} user={user} button="info"></OnlineUserLine>)
            }
            else {
                onlineUsersDomElements.push(<OnlineUserLine key={onlineUserKey++} user={user} button="default"></OnlineUserLine>)
            }
            
        })
        return onlineUsersDomElements
    },
    render: function () {
        var messages = this.buildMessagesToRender()
        var onlineUsers = this.buildOnlineUsersToRender()
        return (
            <div className="chatPage hide">
                <div className="chatTop">
                    <div className="container">
                        <div className="row">
                            <div className="col-sm-8 col-xs-4">
                                <h3 className="h3VerticalMiddle">Hello {this.state.username}!</h3>
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
                                        <div className="deleteCorrespondenceWarning hide">
                                            <div className="alert alert-warning text-center">
                                                Are you sure you want to delete this chat? This is an irreversible step!
                                            </div>
                                            <div className="positionRelative">
                                                <button className="btn btn-warning yesDeleteCorrespondence yesButton"
                                                        type="button">Yes
                                                </button>
                                                <button className="btn btn-info noDontDeleteCorrespondence noButton"
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
                        <div className="row">
                            <div className="col-xs-2">
                                <table className="table">
                                    <tbody>
                                    {onlineUsers || []}
                                    </tbody>
                                </table>
                            </div>
                            <div className="col-sm-8 col-xs-6">
                                <table className="table">
                                    <tbody>
                                    {messages || []}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="chatBottom">
                    <div className="container">
                        <div className="row">
                            <form className="messageForm">
                                <div className="col-sm-10 col-xs-8">
                                    <div className="form-group">
                                        <input className="form-control" type='text' placeholder='message'/>
                                    </div>
                                </div>
                                <div className="col-sm-2 col-xs-4">
                                    <button className="btn btn-success submitMessage" type='submit'>Submit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    scrollToBottom: function () {
        var chatBody = document.querySelector('.chatBody')
        chatBody.scrollTop = chatBody.scrollHeight;

    },
    componentDidUpdate: function () {
        chatComponent.scrollToBottom()
        chatComponent.waitForPrivateChatClick()
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
                <link href="../../../assets/css/general.css" rel="stylesheet"/>
                <LoginAsPage></LoginAsPage>
                <LoginSignupPage></LoginSignupPage>
                <ChatPage></ChatPage>
            </div>
        )
    },
    start: function () {
        $('.loadingMessage').addClass('hide')
        clientComponent.adjustElementsToDeviceType();
        clientComponent.sendUserDetails();
        socket.removeAllListeners('env')
        socket.on('env', function (env) {
            window.localStorage.setItem('env', env)
        })
        var storageUsername = window.localStorage.getItem('chatUserName')
        if (storageUsername) {
            clientComponent.navigateToLoginAsPage(storageUsername)
        }
        else {
            clientComponent.navigateToLoginSignupPage()
        }

    },
    navigateToLoginAsPage: function (username) {
        loginAsComponent.start(username)
    },
    navigateToLoginSignupPage: function () {
        loginAsComponent.finish()
        loginSignupComponent.start()
    },
    navigateToChatPage: function (username, previousPage) {
        switch (previousPage) {
            case 'loginAs':
                loginAsComponent.finish()
                break
            case 'loginSignup':
                loginSignupComponent.finish()
                break
            default:
                break
        }
        chatComponent.start(username)
    },
    setUsernameStorage: function (username) {
        if (username) {
            window.localStorage.setItem('chatUserName', username)
            if (localStorage.getItem('env') === 'dev') {
                window.sessionStorage.setItem('chatUserName', username)
            }
        }
    },
    getUsernameStorage: function () {
        if (window.localStorage.getItem('env') === 'dev') {
            return window.sessionStorage.getItem('chatUserName')
        }
        return window.localStorage.getItem('chatUserName')
    },
    adjustElementsToDeviceType: function () {
        var deviceInputClass, deviceButtonClass
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            deviceInputClass = 'lg'
            deviceButtonClass = 'lg'
        }
        else {
            deviceInputClass = 'xs'
            deviceButtonClass = 'md'
        }
        $('button').addClass('btn-' + deviceButtonClass)
        $('input').addClass('input-' + deviceInputClass)
        $('.saveCorrespondence').removeClass('btn-lg')
        $('.deleteCorrespondence').removeClass('btn-lg')
        $('.yesDeleteCorrespondence').removeClass('btn-lg')
        $('.noDontDeleteCorrespondence').removeClass('btn-lg')
    },
    sendUserDetails: function () {
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
    componentDidMount: function () {
        clientComponent = this
        clientComponent.start()
    }
})

module.exports = Client


