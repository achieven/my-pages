'use strict'
const express = require('express');
const app = express();
const Handlebars = require('handlebars');
const fs = require('fs');
const bodyParser = require('body-parser')
const socketio = require('socket.io')
const http = require('http')
const server = http.Server(app);
const io = socketio(server);
const userAgentParser = require('user-agent-parser')
const util = require('./util/util')
const winston = require('winston')
var serverLogger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({ filename: 'server.log' })
    ]
});


app.use(express.static(__dirname + '/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res, next) {

    var projects = [
        {name: 'emitter', link: '/emitter'},
        {name: 'backend', link: '/backend'},
        {name: 'Simple Rest Api', link: '/simplerestapi'},
        {name: 'React Messenger (still in construction)', link: '/messengerReact'},
        {name: 'User Details (responsive)', link: '/userDetails'}

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

app.get('/emitter', function (req, res) {
    const requirejs = require('requirejs')

    requirejs([
        'react',
        'react-dom/server',
        'browserify',
        'node-jsx',
        'mywebsites/emitter/server/serverUtil.js',
    ], function (React,
                 ReactDOMServer,
                 browserify,
                 jsx,
                 util) {

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
    })

})

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
    var db = new sqlite.Database('./mywebsites/simplerestapi/my_db.db')

    db.serialize(function () {
        var query = 'CREATE TABLE if not exists profiles (id INTEGER NOT NULL PRIMARY KEY, name varchar, bio varchar, fb_id varchar)'
        db.run(query, function (err, response) {
            console.log('create table:', err, response)
        });
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
    var webpack = require('webpack')
    var webpackDevMiddleware = require('webpack-dev-middleware')
    //var webpackHotMiddleware = require('webpack-hot-middleware')
    var config = require('./mywebsites/messenger/webpack.config')

    var compiler = webpack(config)
    app.use(webpackDevMiddleware(compiler, {noInfo: true, publicPath: config.output.publicPath}))
    //app.use(webpackHotMiddleware(compiler))
    var html = Handlebars.compile(fs.readFileSync('./mywebsites/messenger/index.html', 'utf8'))()
    res.status(200).send(html)
    let allClientSocekts = []
    let socketId = 0
    io.of('/messengerReact').on('connection', function (socket) {
        socketId++
        if (!socket.socketId) {
            socket.socketId = socketId
            allClientSocekts.push(socket)
        }
        socket.on('clientMessage', function (data) {
            allClientSocekts.forEach(function (_socket) {
                if (socket.socketId != _socket.socketId) {
                    _socket.emit('serverMessageToOther', data)
                }
                else {
                    _socket.emit('serverMessageToMe', data)
                }
            })
        })
        socket.on('disconnect', function () {
            allClientSocekts = allClientSocekts.filter(function (_socket) {
                return socket.socketId != _socket.socketId
            })
        })
    })
})
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
                    content: {name: {header: 'Name', content: osName}, version: {header: 'Version', content: osVersion}}
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
                triplets: [{
                    browser: {header: 'Browser'},
                    engine: {header: 'Engine'},
                    os: {header: 'OS'}
                }, {
                    device: {header: 'Device'},
                    cpu: {header: 'Cpu'}
                }]
            }
        }
    });
    res.send(html);

    const sqlite = require('sqlite3').verbose()
    var db = new sqlite.Database('./mywebsites/userDetails/my_db.db')
    db.serialize(function () {
        var query = 'CREATE TABLE if not exists userdata (ipUserAgent varchar NOT NULL PRIMARY KEY, ip varchar, hostname varchar, country varchar, city varchar, loc varchar, org varchar, region varchar, browserName varchar, browserVersion varchar, engineName varchar, engineVersion varchar, osName varchar, osVersion varchar, deviceModel varchar, deviceVendor varchar, deviceType varchar, cpuArchitecture varchar)'
        db.run(query, function (err, response) {
            console.log('create table:', err, response)
        });
    })

    app.post('/userDetails/userdata', function (req, res) {
        var ipUserAgent = req.body.ipAddress + osName + osVersion + engineName + engineVersion + browserName + browserVersion
        var ipExistsQuery = 'SELECT ipUserAgent from userdata'

        db.all(ipExistsQuery, function (err, allIpUserAgents) {
            serverLogger.log('info','ipUserAgent: ' + ipUserAgent + ' allIpUserAgents:' + JSON.stringify(allIpUserAgents))
            if (allIpUserAgents.map(function (_ipUserAgent) {
                    return _ipUserAgent.ipUserAgent
                }).indexOf(ipUserAgent) < 0) {
                var query = 'INSERT INTO userdata (ipUserAgent, ip, hostname, country, city, loc, org, region, browserName, browserVersion, engineName, engineVersion, osName, osVersion, deviceModel, deviceVendor, deviceType,  cpuArchitecture) VALUES ( ' +
                    JSON.stringify(ipUserAgent) + ', ' + (JSON.stringify(req.body.ipAddress || "")) + ', ' + (JSON.stringify(req.body.hostname || "")) + ', ' + (JSON.stringify(req.body.country || "")) + ', ' + (JSON.stringify(req.body.city || "")) + ', ' + (JSON.stringify(req.body.loc || "")) + ', ' + (JSON.stringify(req.body.org || "")) + ', ' + (JSON.stringify(req.body.region || "")) + ', ' +
                    (JSON.stringify(browserName || "")) + ', ' + (JSON.stringify(browserVersion || "")) + ', ' + (JSON.stringify(engineName || "")) + ', ' + (JSON.stringify(engineVersion || "")) + ', ' + (JSON.stringify(osName || "")) + ', ' + (JSON.stringify(osVersion || "")) + ', ' + (JSON.stringify(deviceModel || "")) + ', ' + (JSON.stringify(deviceVendor || "")) + ', ' + (JSON.stringify(deviceType || "")) + ', ' + (JSON.stringify(cpuArchitecture || "")) + ')'
                serverLogger.log('info','query: ' + query)
                db.run(query, function (err, response) {
                    if (err) return res.status(err.code || err.status || 500).send(err)
                    res.status(200).send(response)
                })
            }
            else {
                serverLogger.log('info','nothing was inserted')
                return res.status(200).send('nothing was inserted')
            }
        })
    })
    app.get('/userDetails/userdata/browser', function (req, res) {
        var query = 'SELECT browserName FROM userdata'
        db.all(query, function (err, usersdata) {
            if (err) return res.status(err.code || err.status || 500).send(err)
            return res.status(200).send(usersdata)
        })
    })
    app.get('/userDetails/userdata/engine', function (req, res) {
        var query = 'SELECT engineName FROM userdata'
        db.all(query, function (err, usersdata) {
            if (err) return res.status(err.code || err.status || 500).send(err)
            return res.status(200).send(usersdata)
        })
    })
    app.get('/userDetails/userdata/os', function (req, res) {
        var query = 'SELECT osName FROM userdata'
        db.all(query, function (err, usersdata) {
            if (err) return res.status(err.code || err.status || 500).send(err)
            return res.status(200).send(usersdata)
        })
    })
    app.get('/userDetails/userdata/device', function (req, res) {
        var query = 'SELECT deviceModel, deviceVendor FROM userdata'
        db.all(query, function (err, usersdata) {
            if (err) return res.status(err.code || err.status || 500).send(err)
            return res.status(200).send(usersdata)
        })
    })
    app.get('/userDetails/userdata/cpu', function (req, res) {
        var query = 'SELECT cpuArchitecture FROM userdata'
        db.all(query, function (err, usersdata) {
            if (err) return res.status(err.code || err.status || 500).send(err)
            return res.status(200).send(usersdata)
        })
    })


})

module.exports = app;