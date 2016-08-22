var express = require('express');
var app = express();
var Handlebars = require('handlebars');
var fs = require('fs');

app.get('/', function (req, res) {
    var projects = [
        {name: 'emitter', link:'http://emitter.achievendar.tk'}
    ]
    var html = Handlebars.compile(fs.readFileSync('./app.html', 'utf8'))({
        projects:projects 
    });
    res.send(html);
});
app.use(express.static(__dirname + '/'));

app.listen(process.env.PORT || 5000);

module.exports = app;