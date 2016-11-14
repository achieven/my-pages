'use strict'
const express = require('express');
const app = express();
const Handlebars = require('handlebars');
const fs = require('fs');
const bodyParser = require('body-parser')
const socketio = require('socket.io')
const http = require('http')
const server = http.Server(app);

const userAgentParser = require('user-agent-parser')
const util = require('./util/util')
const winston = require('winston')
var serverLogger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({filename: 'server.log'})
    ]
});
const requirejs = require('requirejs')


app.use(express.static(__dirname + '/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res, next) {
    var projects = [
        {
            name: 'Messenger',
            link: '/messengerReact',
            tools: 'react, redis, socket.io, salt + sha256 hashing, Webpack'
        },
        {name: 'User Details', link: '/userDetails', tools: 'redis, userAgent, chartist.js'},
        {name: 'Simple Rest Api', link: '/simplerestapi', tools: 'sqlite'},
        {name: 'Emitter', link: '/emitter', tools: 'react, socket.io, ES6, Browserify'},
        {name: 'Digital Wallet', link: '/backend', tools: 'colu sdk, async.js'},
        {
            name: 'Leaflet trips (Only link to source code at the moment)',
            link: 'https://github.com/achieven/leaflet',
            tools: 'Angular2, Typescript, Leaflet.js'
        },
        {
            name: 'Hacking (Only link to source code at the moment)',
            link: 'https://github.com/achieven/hacking',
            tools: 'Html injection, Nosql injection (on redis)'
        },
        {
            name: 'Mongo (Only link to source code at the moment)',
            link: 'https://github.com/achieven/nodeMongoApi',
            tools: 'MongoDB, authentication cookie'
        }
    ]
    var mainProjectGithubLink = 'https://github.com/achieven/my-pages'
    var html = Handlebars.compile(fs.readFileSync('./app.html', 'utf8'))({
        projects: projects,
        mainProjectGithubLink: mainProjectGithubLink
    });
    res.send(html);
});
app.use(express.static(__dirname + '/'));

const port = process.env.PORT || 5000
server.listen(port, function () {
    console.log('listening on port', port)
});
const io = socketio(server);
var redisEnv = process.env.NODE_ENV

app.get('/emitter', function (req, res) {


    requirejs([
        'react',
        'react-dom/server',
        'browserify',
        'node-jsx',
    ], function (React,
                 ReactDOMServer,
                 browserify,
                 jsx) {

        jsx.install();
        app.use('/bundle.js', function (req, res) {
            browserify('./mywebsites/emitter/server/app.js').transform('reactify').bundle().pipe(res);
        });
        const Emitter = require('./mywebsites/emitter/client/emitterView.jsx');
        res.setHeader('Content-Type', 'text/html');
        res.end(ReactDOMServer.renderToStaticMarkup(
            React.DOM.body(
                null,
                React.DOM.div({
                    id: 'main',
                    dangerouslySetInnerHTML: {
                        __html: ReactDOMServer.renderToString(React.createElement(Emitter, {
                            ticker: [],
                            chart: {timestamps: [], numbers: [[]]}
                        }))
                    }
                })
            )
        ));
    })
})

function emitterHelper() {
    var util = require('./mywebsites/backend/util/util').processRequests.encoder
    io.of('/emitterPage').on('connection', function (socket) {
        socket.on('/startEmitter', function (data) {
            if (socket.emitJsonIntervalId) {
                clearInterval(socket.emitJsonIntervalId);
            }
            socket.emitJsonIntervalId = setInterval(function () {
                var jsonObjectToEmit = util.generateJson();
                socket.emit('/showEmittedJson', jsonObjectToEmit);
            }, 1000 / data.emitFrequency);
        });
        socket.on('disconnect', function () {
            clearInterval(socket.emitJsonIntervalId);
        })
    });
}
emitterHelper()

app.get('/backend', function (req, res) {

    const Colu = require('colu')
    const util = require('./mywebsites/backend/util/util.js')
    const utilColuFunctions = util.processRequests.coluCalls
    const utilEncoder = util.processRequests.encoder;

    var settings = {
        network: 'testnet',
        privateSeed: process.env.COLU_SDK_PRIVATE_SEED
    };
    var colu = new Colu(settings);
    colu.init();

    colu.on('connect', function () {
        app.use(bodyParser.json())
        app.use(bodyParser.urlencoded({extended: true}));

        var html = Handlebars.compile(fs.readFileSync('./mywebsites/backend/index.html', 'utf8'))();
        res.send(html);


        function validateBody(req, res) {
            if (!(Object.prototype.toString.call(req.body) === '[object Object]')) {
                res.status(500).send({
                    code: 500,
                    message: 'no req.body',
                    explanation: 'req.body is not defined properly'
                })
                return false
            }
            return true
        }

        function sendResponse(res, statusAndResponse) {
            res.status(statusAndResponse.code).send(statusAndResponse.response);
            return statusAndResponse
        }

        app.get('/backend/assets', function (req, res, next) {
            utilColuFunctions.getAssets(colu, function (statusAndResponse) {
                return sendResponse(res, statusAndResponse)
            });
        });

        app.put('/backend/issue', function (req, res) {// this function assumes that client sends content-type 'application/json'
            if (validateBody(req, res)) {
                utilColuFunctions.issueAssets(colu, req.body.assets, function (statusAndResponse) {
                    return sendResponse(res, statusAndResponse)
                })
            }
        });

        app.post('/backend/send', function (req, res) {
            if (validateBody(req, res)) {
                utilColuFunctions.sendAsset(colu, {
                    toAddress: req.body.toAddress,
                    assetId: req.body.assetId,
                    amount: req.body.amount
                }, function (statusAndResponse) {
                    return sendResponse(res, statusAndResponse)
                })
            }
        });


        app.post('/backend/encode', function (req, res) {
            if (validateBody(req, res)) {
                utilEncoder.encode(req.body.number, function (statusAndResponse) {
                    return sendResponse(res, statusAndResponse)
                })
            }
        });
    })


})

app.get('/simplerestapi', function (req, res) {

    var html = Handlebars.compile(fs.readFileSync('./mywebsites/simplerestapi/index.html', 'utf8'))();
    res.send(html)

    const sqlite = require('sqlite3').verbose()
    var db = new sqlite.Database('./mywebsites/simplerestapi/' + process.env.NODE_ENV + '-simple-rest-api.db')

    db.serialize(function () {
        var query = 'CREATE TABLE if not exists profiles (id INTEGER NOT NULL PRIMARY KEY, name varchar, bio varchar, fb_id varchar)'
        db.run(query)
    })

    app.get('/simplerestapi/profiles', function (req, res) {
        var query = 'SELECT id,name from profiles'
        db.all(query, function (err, people) {
            if (err) return res.send(err.code || err.status || 500).send(err)
            var peopleInTriplets = []
            var triplet = []
            people.forEach(function (person, index) {
                triplet.push(person)
                if (index % 3 === 2) {
                    peopleInTriplets.push(triplet)
                    triplet = []
                }
            })
            if (triplet.length > 0) {
                peopleInTriplets.push(triplet)
            }
            res.send(peopleInTriplets)
        })
    })
    app.post('/simplerestapi/profiles', function (req, res) {
        var name = JSON.stringify(req.body.name)
        if (name.length > 23) {
            return res.status(400).send('name cant be longer than 23 letters!')
        }
        var bio = JSON.stringify(req.body.bio)
        var fb_id = JSON.stringify(req.body.fb_id)
        var query = 'INSERT INTO profiles (name, bio, fb_id) VALUES ( ' + name + ', ' + bio + ', ' + fb_id + ')'
        db.run(query, function (err, response) {
            if (err) return res.status(err.code || err.status || 500).send(err)
            res.status(200).send(response)
        })
    })
    app.get('/simplerestapi/profiles/:profileId', function (req, res) {
        var query = 'SELECT * FROM profiles WHERE id    =' + req.params.profileId
        db.all(query, function (err, response) {
            if (err) return res.status(err.code || err.status || 500).send(err)
            response[0].picture = 'http://graph.facebook.com/' + response[0].fb_id + '/picture'
            res.status(200).send(response)
        })
    })

    app.put('/simplerestapi/profiles/:profileId', function (req, res) {
        var setName = req.body.newName ? 'name=' + JSON.stringify(req.body.newName) : ''
        if (setName) {
            if (req.body.newName.length > 23) {
                return res.status(400).send('name cant be longer than 23 letters')
            }
        }
        var setBio = req.body.newBio ? 'bio=' + JSON.stringify(req.body.newBio) : ''
        var setFb_id = req.body.newFb_id ? 'fb_id=' + JSON.stringify(req.body.newFb_id) : ''
        var whatToSetArray = [setName, setBio, setFb_id]
        var whatToSetString = ''
        whatToSetArray = whatToSetArray.filter(function (field) {
            return field
        })
        whatToSetArray.forEach(function (field, index) {
            if (index < whatToSetArray.length - 1) {
                whatToSetString += field + ', '
            }
            else {
                whatToSetString += field
            }
        })
        var query = whatToSetString ? 'UPDATE profiles SET ' + whatToSetString + ' WHERE id=' + req.body.id : ''
        if (query) {
            db.run(query, function (err, response) {
                if (err) return res.status(err.code || err.status || 500).send(err)
                res.status(200).send(response)
            })
        }
        else {
            res.status(200).send('nothing to update here')
        }
    })

    app.delete('/simplerestapi/profiles/:profileId', function (req, res) {
        var query = 'DELETE FROM profiles WHERE id=' + req.params.profileId
        db.run(query, function (err, response) {
            if (err) return res.status(err.code || err.status || 500).send(err)
            res.status(200).send(response)
        })
    })
})

app.get('/messengerReact', function (req, res) {
    var html = Handlebars.compile(fs.readFileSync('./mywebsites/messenger/index.html', 'utf8'))({
        env: process.env.NODE_ENV,
        componentsToShow: JSON.stringify(['loginAs', 'loginSignup'])
    })
    res.status(200).send(html)
})
app.get('/messengerReact/resetPassword', function (req, res) {
    var html = Handlebars.compile(fs.readFileSync('./mywebsites/messenger/index.html', 'utf8'))({
        env: process.env.NODE_ENV,
        componentsToShow: JSON.stringify(['resetPassword']),
        token: req.query.token,
        tokenClass: 'token'
    })
    res.status(200).send(html)
})

function messengerHelper() {
    var redis = require('redis');
    var redisClient = redis.createClient();
    var util = require('./mywebsites/messenger/util/util')
    redisClient.on('connect', function () {
        let allClientSockets = []
        let socketId = 0
        io.of('/messengerReact').on('connection', function (socket) {
            socketId = util.addSocket(socket, allClientSockets, socketId)
            socket.removeAllListeners('signup')
            socket.removeAllListeners('login')
            socket.removeAllListeners('forgotPassword')
            socket.removeAllListeners('resetPassword')
            socket.removeAllListeners('loginAs')
            socket.removeAllListeners('getOnlineUsers')
            socket.removeAllListeners('clientMessage')
            socket.removeAllListeners('deleteCorrespondence')
            socket.removeAllListeners('openPrivateChat')
            socket.removeAllListeners('openGroupChat')


            function keepSocketAlive() {
                setInterval(function () {
                    socket.emit('heartbeat')
                }, 3000)
            }

            keepSocketAlive()

            function mockSslCertificate() {
                socket.removeAllListeners('canITrustYou?')
                socket.on('canITrustYou?', function () {
                    socket.emit('yesTrustMe')
                })
            }

            mockSslCertificate();
            socket.on('signup', function (data) {
                util.signup(redisClient, data, function (message, param) {
                    socket.username = param
                    socket.emit(message, param)
                })
            })
            socket.on('login', function (data) {
                util.login(redisClient, data, function (message, param) {
                    socket.username = param
                    socket.emit(message, param)
                    socket.emit('addOnlineUser', socket.username)
                })
            })
            socket.on('forgotPassword', function (username) {
                console.log(username)
                util.forgotPassword(redisClient, username, function (message) {
                    socket.emit(message)
                })
            })
            socket.on('resetPassword', function (data) {
                util.resetPassword(redisClient, data, function (message, param) {
                    socket.emit(message, param)
                })
            })
            socket.on('loginAs', function (username) {
                socket.username = username
                socket.emit('addOnlineUser', username)
            })
            socket.on('getOnlineUsers', function () {
                util.getOnlineUsers(allClientSockets, function (_socket, message, param) {
                    _socket.username && _socket.emit(message, param)
                })
            })
            socket.on('clientMessage', function (data) {
                util.sendMessage(socket, redisClient, allClientSockets, data, function (_socket, message, param) {
                    _socket.emit(message, param)
                })
            })
            socket.on('deleteCorrespondence', function (deleterUsername, deleteChatWith) {
                util.deleteChat(redisClient, deleterUsername, deleteChatWith, function (message) {
                    socket.emit(message)
                })
            })
            socket.on('openPrivateChat', function (chatParticipants) {
                util.openPrivateChat(redisClient, chatParticipants, function (message, param) {
                    socket.emit(message, param)
                })
            })
            socket.on('openGroupChat', function (username) {
                util.openGroupChat(redisClient, username, function (message, param) {
                    socket.emit(message, param)
                })
            })
            socket.on('disconnect', function () {
                console.log(socket.username, 'disconnecting')
                serverLogger.log('info', socket.username + ' disconnecting')
                allClientSockets = util.removeSocket(socket, allClientSockets)
                util.getOnlineUsers(allClientSockets, function (_socket, message, param) {
                    _socket.username && _socket.emit(message, param)
                })
            })
        })
    })
}
messengerHelper();

function buildPage() {
    var webpack = require('webpack')
    var webpackDevMiddleware = require('webpack-dev-middleware')
    //var webpackHotMiddleware = require('webpack-hot-middleware')
    var config = require('./mywebsites/messenger/webpack.config.js')

    var compiler = webpack(config)
    app.use(webpackDevMiddleware(compiler, {noInfo: true, publicPath: config.output.publicPath}))
    //app.use(webpackHotMiddleware(compiler))
}

buildPage()
var redis = require('redis');
var redisClient = redis.createClient();
redisClient.on('connect', function () {

    app.get('/userDetails', function (req, res) {


        const parser = new userAgentParser()
        const parsedUserAgent = parser.setUA(req.headers['user-agent']).getResult()
        var browser = parsedUserAgent.browser, browserName = browser.name, browserVersion = browser.version
        var engine = parsedUserAgent.engine, engineName = engine.name, engineVersion = engine.version
        var os = parsedUserAgent.os, osName = os.name, osVersion = os.version
        var device = parsedUserAgent.device, deviceModel = device.model, deviceVendor = device.vendor, deviceType = device.type
        var cpu = parsedUserAgent.cpu, cpuArchitecture = cpu.architecture

        var html = Handlebars.compile(fs.readFileSync('./mywebsites/userDetails/index.html', 'utf8'))({
            contents: {
                ipinfo: {
                    ipAddress: {header: 'IP address', classname: 'ipAddress'},
                    hostname: {header: 'Host Name', classname: 'hostname'},
                    country: {header: 'Country', classname: 'country'},
                    city: {header: 'City', classname: 'city'},
                    loc: {header: 'Coordinates', classname: 'loc'},
                    org: {header: 'Internet Provider', classname: 'org'},
                    region: {header: 'Region', classname: 'region'},
                },
                userAgentInfo: {
                    browser: {
                        header: 'Browser',
                        content: {
                            name: {header: 'Name', content: browserName},
                            version: {header: 'Version', content: browserVersion}
                        }
                    },
                    engine: {
                        header: 'Engine',
                        content: {
                            name: {header: 'Name', content: engineName},
                            version: {header: 'Version', content: engineVersion}
                        }
                    },
                    os: {
                        header: 'Operating System',
                        content: {
                            name: {header: 'Name', content: osName},
                            version: {header: 'Version', content: osVersion}
                        }
                    },
                    device: {
                        header: 'Device',
                        content: {
                            model: {header: 'Model', content: deviceModel},
                            vendor: {header: 'Vendor', content: deviceVendor},
                            type: {header: 'Type', content: deviceType}
                        }
                    },
                    cpu: {header: 'Cpu', content: {architecture: {header: 'Architecture', content: cpuArchitecture}}}
                },
                statisticsInfo: {
                    browser: {header: 'Browser'},
                    engine: {header: 'Engine'},
                    os: {header: 'OS'},
                    device: {header: 'Device'},
                    cpu: {header: 'Cpu'}
                }

            }
        });
        res.send(html);

        app.get('/userDetails/userdata/browser', function (req, res) {
            var allUsersDetailsQuery = redisEnv + '#allUsersDetails#'
            redisClient.get(allUsersDetailsQuery, function (err, allUsersDetails) {
                var relevantUsersDetails = JSON.parse(allUsersDetails).map(function (userDetails) {
                    return userDetails.browserName
                })
                return res.status(200).send(relevantUsersDetails)
            })

        })
        app.get('/userDetails/userdata/engine', function (req, res) {
            var allUsersDetailsQuery = redisEnv + '#allUsersDetails#'
            redisClient.get(allUsersDetailsQuery, function (err, allUsersDetails) {
                var relevantUsersDetails = JSON.parse(allUsersDetails).map(function (userDetails) {
                    return userDetails.engineName
                })
                return res.status(200).send(relevantUsersDetails)
            })
        })
        app.get('/userDetails/userdata/os', function (req, res) {
            var allUsersDetailsQuery = redisEnv + '#allUsersDetails#'
            redisClient.get(allUsersDetailsQuery, function (err, allUsersDetails) {
                var relevantUsersDetails = JSON.parse(allUsersDetails).map(function (userDetails) {
                    return userDetails.osName
                })
                return res.status(200).send(relevantUsersDetails)
            })
        })
        app.get('/userDetails/userdata/device', function (req, res) {
            var allUsersDetailsQuery = redisEnv + '#allUsersDetails#'
            redisClient.get(allUsersDetailsQuery, function (err, allUsersDetails) {
                var relevantUsersDetails = JSON.parse(allUsersDetails).map(function (userDetails) {
                    return [userDetails.deviceModel, userDetails.deviceVendor]
                })
                return res.status(200).send(relevantUsersDetails)
            })
        })
        app.get('/userDetails/userdata/cpu', function (req, res) {
            var allUsersDetailsQuery = redisEnv + '#allUsersDetails#'
            redisClient.get(allUsersDetailsQuery, function (err, allUsersDetails) {
                var relevantUsersDetails = JSON.parse(allUsersDetails).map(function (userDetails) {
                    return userDetails.cpuArchitecture
                })
                return res.status(200).send(relevantUsersDetails)
            })
        })
    })

    const sqlite = require('sqlite3').verbose()
    var db = new sqlite.Database('./mywebsites/userDetails/' + process.env.NODE_ENV + '-user-details.db')
    db.serialize(function () {
        var query = 'CREATE TABLE if not exists userdata (ipUserAgent varchar NOT NULL PRIMARY KEY, ip varchar, hostname varchar, country varchar, city varchar, loc varchar, org varchar, region varchar, browserName varchar, browserVersion varchar, engineName varchar, engineVersion varchar, osName varchar, osVersion varchar, deviceModel varchar, deviceVendor varchar, deviceType varchar, cpuArchitecture varchar)'
        db.run(query)
    })


    app.post('/userDetails/userdata', function (req, res) {
        const parser = new userAgentParser()
        const parsedUserAgent = parser.setUA(req.headers['user-agent']).getResult()
        var browser = parsedUserAgent.browser, browserName = browser.name, browserVersion = browser.version
        var engine = parsedUserAgent.engine, engineName = engine.name, engineVersion = engine.version
        var os = parsedUserAgent.os, osName = os.name, osVersion = os.version
        var device = parsedUserAgent.device, deviceModel = device.model, deviceVendor = device.vendor, deviceType = device.type
        var cpu = parsedUserAgent.cpu, cpuArchitecture = cpu.architecture
        var ipUserAgent = req.body.ipAddress + osName + osVersion + engineName + engineVersion + browserName + browserVersion

        var ipUserAgentQuery = redisEnv + '#ipUserAgent#' + ipUserAgent
        redisClient.exists(ipUserAgentQuery, function (err, reply) {
            if (reply === 0) {
                var allUserDetails = {
                    ip: req.body.ipAddress || "",
                    hostname: req.body.hostname | "",
                    country: req.body.country || "",
                    city: req.body.city || "",
                    loc: req.body.loc || "",
                    org: req.body.org || "",
                    region: req.body.region || "",
                    browserName: browserName || "",
                    browserVersion: browserVersion || "",
                    engineName: engineName || "",
                    engineVersion: engineVersion || "",
                    osName: osName || "",
                    osVersion: osVersion || "",
                    deviceModel: deviceModel || "",
                    deviceVendor: deviceVendor || "",
                    deviceType: deviceType || "",
                    cpuArchitecture: cpuArchitecture || ""
                }
                redisClient.set(ipUserAgentQuery, 'whatever', function () {
                    var allUsersQuery = redisEnv + '#allUsersDetails#'
                    redisClient.exists(allUsersQuery, function (err, reply) {
                        if (reply === 0) {
                            redisClient.set(allUsersQuery, JSON.stringify([allUserDetails]), function () {
                                res.status(200).send({err: null, response: 1})
                            })
                        }
                        else if (reply === 1) {
                            redisClient.get(allUsersQuery, function (err, allUsersDetails) {
                                var allUsersDetails = JSON.parse(allUsersDetails)
                                allUsersDetails.push(allUserDetails)
                                redisClient.set(allUsersQuery, JSON.stringify(allUsersDetails), function () {
                                    res.status(200).send({err: null, response: allUsersDetails.length})
                                })
                            })
                        }
                    })
                })
            }
            else {
                var allUsersQuery = redisEnv + '#allUsersDetails#'
                redisClient.get(allUsersQuery, function (err, allUsersDetails) {
                    res.status(200).send({err: null, response: JSON.parse(allUsersDetails).length})
                })
            }
        })
    })
})

app.get('/error', function (req, res) {
    var html = Handlebars.compile(fs.readFileSync('./error.html', 'utf8'))();
    res.send(html)
})



