const express = require('express');
const app = express();
const Handlebars = require('handlebars');
const fs = require('fs');
const bodyParser = require('body-parser')
const socketio = require('socket.io')
const http = require('http')
const server = http.Server(app);
const io = socketio(server);

app.use(express.static(__dirname + '/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res, next) {
    var projects = [
        {name: 'emitter', link: '/emitter'},
        {name: 'backend', link: '/backend'},
        {name: 'Simple Rest Api', link: '/simplerestapi'}
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
        if(name.length > 23){
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
        if(setName){
            if(req.body.newName.length > 23){
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
    var webpackHotMiddleware = require('webpack-hot-middleware')
    var config = require('./webpack.config')

    var app = new (require('express'))()
    var port = 1337

    var compiler = webpack(config)
    app.use(webpackDevMiddleware(compiler, {noInfo: true, publicPath: config.output.publicPath}))
    app.use(webpackHotMiddleware(compiler))

    res.sendFile(__dirname + '/messengerReact/index.html')
})

module.exports = app;