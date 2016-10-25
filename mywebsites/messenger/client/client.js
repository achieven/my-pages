import React from 'react'
import io from '../../../node_modules/socket.io-client/socket.io'
var socket = io('/messengerReact')
const $ = require('../../.././node_modules/jquery/dist/jquery.min.js')
var clientComponent, loginAsComponent, loginSignupComponent, chatComponent
var Ladda = require('ladda')

var setUsernameStorage = function (username) {
    if (username) {
        window.localStorage.setItem('chatUserName', username)
        if (localStorage.getItem('env') === 'dev') {
            window.sessionStorage.setItem('chatUserName', username)
        }
    }
}
var getUsernameStorage = function () {
    if (window.localStorage.getItem('env') === 'dev') {
        return window.sessionStorage.getItem('chatUserName')
    }
    return window.localStorage.getItem('chatUserName')
}

function escapeUnescapeHtml(text) {
    text = text.split('<').join('&lt')
    text = text.split('>').join('&gt')
    return text
}

var LoginAsPage = React.createClass({
    start: function () {
        $('.loginAs').removeClass('hide')
        var username = getUsernameStorage()
        $('.yesLoginAs').on('click', function () {
            socket.emit('loginAs', username)
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
                                as {getUsernameStorage()}?</h3>
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
    getInitialState: function () {
        return {
            loginTrials: (this.props.loginTrials || 0)
        }
    },
    start: function () {
        $('.loginSignupPage').removeClass('hide')
        loginSignupComponent.submitLoginForm();
        loginSignupComponent.submitSignupForm();
        loginSignupComponent.forgotPassword()
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
                                    <span className="paddingLeft15px">
                                        <a href="#" className="forgotPasswordBtn">Forgot Password?</a>
                                    </span>
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
                                    <label>Email</label>
                                    <input type="email" className="col-xs-9 form-control emailSignup"/>
                                </div>
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
                setUsernameStorage(username);
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
            var emailSignup = $('.emailSignup').val()
            var usernameSignup = $('.usernameSignup').val()
            var passwordSignup1 = $('.passwordSignup1').val()
            var passwordSignup2 = $('.passwordSignup2').val()
            if (usernameSignup.length < 8 || usernameSignup.length > 50) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Username must be between 8 and 50 characters')
            }
            else if (usernameSignup.indexOf('#') > -1) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Character # is not allowed in username')
            }
            else if (passwordSignup1.length < 8) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Password must be at least 8 characters')
            }
            else if (passwordSignup1 != passwordSignup2) {
                $('.signupError').removeClass('hide')
                $('.signupError').text('Passwords dont match')
            }
            else {
                var data = {
                    username: usernameSignup,
                    password: passwordSignup2,
                    email: emailSignup
                }
                socket.emit('signup', data)
                socket.removeAllListeners('signupSuccess')
                socket.on('signupSuccess', function (username) {
                    setUsernameStorage(username)
                    clientComponent.navigateToChatPage(username, 'loginSignup');
                })
                socket.on('signupFail', function (username) {
                    $('.signupError').removeClass('hide')
                    $('.signupError').text('Username ' + username + ' is not available')
                })
            }
        })
    },
    forgotPassword: function () {
        $('.forgotPasswordBtn').on('click', function (e) {
            e.preventDefault()
            var usernameLogin = $('.usernameLogin').val()
            if (usernameLogin.length < 8 || usernameLogin.length > 50) {
                $('.loginError').removeClass('hide')
                $('.loginError').text('Insert a valid username, should be between 8 and 50 characters')
            }
            else {
                socket.emit('forgotPassword',usernameLogin)
                socket.removeAllListeners('sendRestPasswordEmail')
                socket.on('sentResetPasswordEmail', function(){
                    $('.loginError').removeClass('hide')
                    $('.loginError').text('An email with a reset password link was sent to you. We use the email you entered when signing up.')
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
            from: this.props.from || '',
            message: this.props.message || ''
        }
    },

    render: function () {
        var classname = "alert " + this.props.color
        var textInline = this.props.from + ': ' + this.props.message
        return (
            <tr>
                <td className={classname}>
                    <p className="messageSender">{this.props.from}</p>
                    <h6 className="textInline">{this.props.message}</h6>
                </td>
            </tr>
        )
    }
})


var OnlineUserLine = React.createClass({
    getInitialState: function () {
        return {
            user: this.props.user || '',
            button: this.props.button || '',
            newMesages: this.props.newMessages || 0
        }
    },
    render: function () {
        var className = "textInline onlineUserBtn btn btn-" + this.props.button
        var newMessagesLine
        switch (this.props.newMessages) {
            case 0:
                newMessagesLine = ''
                break
            case 1:
                newMessagesLine = '1 new message!'
                break
            default:
                newMessagesLine = this.props.newMessages + ' new messages!'
                break
        }
        return (
            <tr>
                <td className="alert alert-info">
                    <button className={className}>{this.props.user}</button>
                    <label className="newMessage">{newMessagesLine}</label>
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
        this.setState({
            username: username
        })
        this.showCorrespondence(username);
        this.showOnlineUsers()
        this.listenToUserMessages()
        this.waitForMessageSubmit(username);
        this.waitForChatDelete();

    },
    waitForMessageSubmit: function (username) {
        var thisComponent = this
        $('.submitMessage').on('click', function (e) {
            e.preventDefault()
            var message = $('.messageForm :input').val()
            message && socket.emit('clientMessage', {
                message: message,
                from: username,
                to: thisComponent.state.otherUsername
            })
            $('.messageForm')[0].reset()
        })
    },
    waitForChatDelete: function () {
        $('.deleteCorrespondence').on('click', function (e) {
            e.preventDefault()
            chatComponent.scrollToBottom()
            $('.deleteCorrespondenceWarning').removeClass('hide')
            $('.yesDeleteCorrespondence').on('click', function (e) {
                e.preventDefault()
                socket.emit('deleteCorrespondence', chatComponent.state.username, chatComponent.state.otherUsername)
                socket.removeAllListeners('correspondenceDeleted')
                socket.on('correspondenceDeleted', function () {
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
        var thisComponent = this
        $('.onlineUserBtn').unbind('click').click(function (e) {
            $('.writeToEveryone').removeClass('btn-info').addClass('btn-default')
            var userToSend = e.currentTarget.textContent
            socket.emit('openPrivateChat', {from: getUsernameStorage(), to: userToSend})
            socket.removeAllListeners('showPrivateChat')
            socket.on('showPrivateChat', function (messages) {
                chatComponent.setState({
                    messages: messages,
                    otherUsername: userToSend,
                    onlineUsers: thisComponent.resetNewMessagesToUser(userToSend)
                })
            })
        })
        $('.writeToEveryone').unbind('click').click(function (e) {
            $('.writeToEveryone').removeClass('btn-defualt').addClass('btn-info')
            socket.emit('openGroupChat', thisComponent.state.username)
            socket.removeAllListeners('showGroupChat')
            socket.on('showGroupChat', function (messages) {
                chatComponent.setState({
                    messages: messages,
                    otherUsername: undefined,
                })
            })
        })
    },
    showOnlineUsers: function () {
        socket.emit('getOnlineUsers')
        socket.removeAllListeners('showOnlineUsers')
        socket.on('showOnlineUsers', function (onlineUsers) {
            var indexOfMe = onlineUsers.findIndex(function (user) {
                return user.username === getUsernameStorage()
            })
            onlineUsers.splice(indexOfMe, 1)
            var indexOfOtherUser = onlineUsers.findIndex(function (user) {
                return user.username === chatComponent.state.otherUsername
            })
            if (indexOfOtherUser < 0) {
                $('.writeToEveryone').removeClass('btn-defualt').addClass('btn-info')
                socket.emit('openGroupChat', chatComponent.state.username)
                socket.removeAllListeners('showGroupChat')
                socket.on('showGroupChat', function (messages) {
                    chatComponent.setState({
                        messages: messages,
                        otherUsername: undefined,
                    })
                })
            }
            chatComponent.setState({
                onlineUsers: onlineUsers
            })
        })
    },
    showCorrespondence: function (username) {
        socket.emit('openGroupChat', username)
        socket.removeAllListeners('showGroupChat')
        socket.on('showGroupChat', function (messages) {
            chatComponent.setState({
                messages: messages,
                otherUsername: undefined,
            })
        })
    },
    listenToUserMessages: function () {
        var thisComponent = this
        socket.removeAllListeners('serverMessageToOther')
        socket.removeAllListeners('serverMessageToMe')
        socket.on('serverMessageToOther', function (data) {
            thisComponent.recieveMessageFromOther(data.message, data.from, data.to)
        })
        socket.on('serverMessageToMe', function (data) {
            thisComponent.recieveMessageFromMe(data.message, data.from)
        })
    },
    recieveMessageFromOther: function (message, from, to) {
        if (to) {
            if (to === getUsernameStorage()) {
                if (from === this.state.otherUsername) {
                    var messages = this.updateMessages(message, from)
                    this.setState({
                        messages: messages
                    })
                }
                else {
                    var onlineUsers = this.addNewMessageToUser(from)
                    this.setState({
                        onlineUsers: onlineUsers
                    })
                }
            }
        }
        else {
            if (!(this.state.otherUsername)) {
                var messages = this.updateMessages(message, from)
                this.setState({
                    messages: messages
                })
            }
        }
    },
    recieveMessageFromMe: function (message, from) {
        var messages = this.updateMessages(message, from)
        this.setState({
            messages: messages
        })
    },
    updateMessages: function (message, from) {
        var messages = this.state.messages
        messages.push({message: message, from: from})
        return messages
    },
    addNewMessageToUser: function (from) {
        var thisComponent = this
        var onlineUsers = this.state.onlineUsers
        onlineUsers.forEach(function (user) {
            if (from === user.username) {
                user.newMessages++
            }
        })
        return onlineUsers
    },
    resetNewMessagesToUser: function (from) {
        var thisComponent = this
        var onlineUsers = this.state.onlineUsers
        onlineUsers.forEach(function (user) {
            if (from === user.username) {
                user.newMessages = 0
            }
        })
        return onlineUsers
    },
    buildMessagesToRender: function () {
        var messagesDomElements = []
        this.state.messages.forEach(function (data) {
            var color, from
            if (window.localStorage.getItem('env') === 'dev') {
                color = data.from === window.sessionStorage.getItem('chatUserName') ? chatComponent.colors.me : chatComponent.colors.others[(data.socketId) % (chatComponent.colors.others.length)]
                from = data.from === window.sessionStorage.getItem('chatUserName') ? '' : data.from
            }
            else {
                color = data.from === window.localStorage.getItem('chatUserName') ? chatComponent.colors.me : chatComponent.colors.others[(data.socketId) % (chatComponent.colors.others.length)]
                from = data.from === window.localStorage.getItem('chatUserName') ? '' : data.from
            }

            messagesDomElements.push(
                <MessageLine key={chatComponent.messageKey++} message={data.message} from={from}
                             color={color}></MessageLine>
            )
        })
        return messagesDomElements
    },
    buildOnlineUsersToRender: function () {
        var onlineUsersDomElements = []
        var onlineUserKey = 0
        this.state.onlineUsers.forEach(function (user) {
            if (!chatComponent) {
                onlineUsersDomElements.push(<OnlineUserLine key={onlineUserKey++} user={user.username}
                                                            button="default"
                                                            newMessages={user.newMessages}></OnlineUserLine>)
            }
            else if (chatComponent.state.otherUsername === user.username) {
                onlineUsersDomElements.push(<OnlineUserLine key={onlineUserKey++} user={user.username}
                                                            button="info"
                                                            newMessages={user.newMessages}></OnlineUserLine>)
            }
            else {
                onlineUsersDomElements.push(<OnlineUserLine key={onlineUserKey++} user={user.username}
                                                            button="default"
                                                            newMessages={user.newMessages}></OnlineUserLine>)
            }
        })
        return onlineUsersDomElements.length > 0 ? onlineUsersDomElements : undefined
    },
    render: function () {
        var messages = this.buildMessagesToRender()
        var onlineUsers = this.buildOnlineUsersToRender()
        return (
            <div className="chatPage hide">
                <div className="chatTop">
                    <div className="container">
                        <div className="row">
                            <div className="col-sm-10 col-xs-8">
                                <h4 className="h3VerticalMiddle">Hello {this.state.username}!</h4>
                            </div>
                            <div className="col-sm-2 col-xs-4">
                                <div className="row">
                                    <div className="col-xs-12">
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
                                    <thead>
                                    <tr>
                                        <th>
                                            <button className="writeToEveryone btn btn-info">Write to
                                                everyone
                                            </button>
                                            <div className="text-center">Or</div>
                                            <div className="text-center tableThReduceFontWeight">Contact online users:
                                            </div>
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {onlineUsers || <tr>
                                        <td>No users online</td>
                                    </tr>}
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
        var storageUsername = getUsernameStorage()
        if (storageUsername) {
            clientComponent.navigateToLoginAsPage()
        }
        else {
            clientComponent.navigateToLoginSignupPage()
        }

    },
    navigateToLoginAsPage: function () {
        loginAsComponent.start()
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
    mockSslCertificate: function () {
        socket.emit('canITrustYou?')
        socket.on('yesTrustMe', function () {
            clientComponent.start()
        })
    },
    componentDidMount: function () {
        clientComponent = this
        this.mockSslCertificate();

    }
})

module.exports = Client


