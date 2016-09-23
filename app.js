var express = require('express');
var app = express();
var Handlebars = require('handlebars');
var fs = require('fs');

app.get('/', function (req, res) {
    var projects = [
        {name: 'emitter', link:'http://emitterachi.achievendar.tk', githubLink: 'https://github.com/achieven/emitter'},
        {name: 'backend', link:'http://backend.achievendar.tk', githubLink: 'https://github.com/achieven/backend'},
        {name: 'Simple Rest Api', link:'http://simplerestapi.achievendar.tk', githubLink: 'https://github.com/achieven/simplerestapi'}
    ]
    var mainProjectGithubLink = 'https://github.com/achieven/my-pages'
    var html = Handlebars.compile(fs.readFileSync('./app.html', 'utf8'))({
        projects:projects,
        mainProjectGithubLink: mainProjectGithubLink
    });
    res.send(html);
});
app.use(express.static(__dirname + '/'));

const port = process.env.PORT || 5000
app.listen(port, function(){
    console.log('listening on port',  port)
});

module.exports = app;