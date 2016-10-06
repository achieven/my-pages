import React from 'react'
import io from '../../../node_modules/socket.io-client/socket.io'
var socket = io('/messengerReact')
const $ = require('../../.././node_modules/jquery/dist/jquery.min.js')
var clientComponent, loginComponent, chatComponent

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
                                <input type="password" className="col-xs-9 form-control passwordSignup"/>
                            </div>
                            <h4 className="row col-xs-12"></h4>
                            <h5 className="signupError hide row col-xs-12">Username is already taken</h5>
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
                    <p style={{fontWeight: 'bold'}}>{this.props.sender}</p>
                    <h6 style={{display:'inline', wordWrap: 'break-word'}}>{this.props.message}</h6>
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
        })
        $('.saveCorrespondence').on('click', function (e) {
            e.preventDefault()
            socket.removeAllListeners('saveCorrespondence')
            socket.emit('saveCorrespondence', {
                username: chatComponent.state.username,
                messages: chatComponent.state.messages
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
            // <div className="container">
            //     <div className="chatPage hide">
            //         <div className="chatTop" style={{position:'fixed'}}>
            //             <div className="row">
            //                 <div className="helloUserName col-xs-3">
            //                     <h4>Hello {this.state.username}!</h4>
            //                 </div>
            //                 <div className="col-xs-6 text-center">
            //                     <button className="btn btn-info saveCorrespondence">Save Chat
            //                     </button>
            //                 </div>
            //                 <div className="col-xs-3">
            //                     <button className="btn btn-danger deleteCorrespondence" type="button"
            //                             style={{right: '20px'}}>Delete Chat
            //                     </button>
            //                     <div className="deleteCorrespondenceWarning text-center hide"
            //                          style={{position: 'relative'}}>
            //                         <div className="row col-xs-12 alert alert-warning" style={{right: '80px'}}>
            //                             Are you sure?
            //                         </div>
            //                         <div className="row col-xs-12">
            //                             <button className="btn btn-warning yesDeleteCorrespondence" type="button"
            //                                     style={{position: 'absolute', left: 0}}>Yes
            //                             </button>
            //                             <button className="btn btn-info noDontDeleteCorrespondence" type="button"
            //                                     style={{right: 0}}>No
            //                             </button>
            //                         </div>
            //                     </div>
            //                 </div>
            //             </div>
            //         </div>
            //         <div className="chatBottom"
            //              style={{position: 'fixed', bottom: 0}}>
            //             <div style={{position: 'relative'}}>
            //                 <div className="row col-xs-12">
            //                     <form className="messageForm">
            //                         <table className="table" style={{position: 'absolute', bottom: '50px', overflow: 'scroll'}}>
            //                             <tbody>
            //                             {messages || []}
            //                             </tbody>
            //                         </table>
            //                         <div className="form-group">
            //                             <div className="col-xs-10">
            //                                 <input className="form-control" type='text' placeholder='message'/>
            //                             </div>
            //                             <div className="col-xs-2">
            //                                 <button className="btn btn-default" type='submit'>Submit</button>
            //                             </div>
            //                         </div>
            //                     </form >
            //                 </div>
            //             </div>
            //         </div>
            //     </div>
            // </div>
            <div className="chatPage hide">
                <div className="chatTop" style={{position: 'fixed', width: '100%', top: 0, height: '55px'}}>
                    <div className="container">
                        <div className="row">
                            <div className="col-sm-8 col-xs-4">
                                <h5>Hello {this.state.username}!</h5>
                            </div>
                            <div className="col-sm-4 col-xs-8">
                                <div className="row">
                                    <div className="col-xs-6">
                                        <button className="btn btn-info row col-xs-12 saveCorrespondence">Save Chat
                                        </button>
                                    </div>
                                    <div className="col-xs-6">
                                        <button className="btn btn-danger row col-xs-12 deleteCorrespondence">Delete
                                            Chat
                                        </button>
                                        <div className="deleteCorrespondenceWarning text-center hide"
                                             style={{position: 'relative', zIndex: 1}}>
                                            <h4 className="row col-xs-12"></h4>
                                            <div className="row col-xs-12 alert alert-warning">
                                                Are you sure you want to delete this chat? This is an irreversible step!
                                            </div>
                                            <div className="row col-xs-12">
                                                <button className="btn btn-warning yesDeleteCorrespondence"
                                                        type="button"
                                                        style={{position: 'absolute', left: 0}}>Yes
                                                </button>
                                                <button className="btn btn-info noDontDeleteCorrespondence"
                                                        type="button"
                                                        style={{position: 'absolute',right: 0}}>No
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="chatBody">
                        <div className="container">
                            <div className="row col-sm-9 col-xs-8"
                                 style={{overflow: 'scroll', position: 'fixed', top: '55px', bottom: '55px'}}>
                                <table className="table">
                                    <tbody>
                                    {messages || []}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                    <div className="chatBottom" style={{position: 'fixed', width: '100%', bottom: 0, height: '55px'}}>
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
            var data = {
                username: $('.usernameSignup').val(),
                password: $('.passwordSignup').val()
            }
            socket.emit('signup', data)
            socket.removeAllListeners('signupSuccess')
            socket.on('signupSuccess', function (username) {
                clientComponent.navigateToChatPage(username);
            })
            socket.on('signupFail', function (username) {
                $('.signupError').removeClass('hide')
            })
        })

    }
})

module.exports = Client