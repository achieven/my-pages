module.exports = function (app, fs, client, sqlite) {

    app.get('/', function (req, res) {
        var html = fs.readFileSync('./index.html', 'utf8')
        res.send(html)
    })
    app.get('/xss', function (req, res) {
        function htmlInjection() {
            res.send('<div>Look into local storage, at item "a", we changed it!</div>')
        }

        var script = req.query.script, defence = req.query.defence
        var malicousScriptDanger = script.indexOf('<') > -1 && script.indexOf('>') > -1
        if (malicousScriptDanger)
            if (defence === 'false') {
                res.send(script)
            }
            else {
                res.send('You wanted defence, so server blocked what you inserted (not specifying defence is considered with defence)')
            }
        else
            res.send('You didnt insert anything malicous')

    })
    app.get('/javascriptinjection', function (req, res) {
        console.log(req.query)
        var script = req.query.script, defence = req.query.defence
        if(defence === 'false'){
            eval(script)
            res.send('Your action was processed at the server, you injected successfully!')
        }
        else{
            res.send('You wanted defence, so server didnt use what you inserted (not specifying defence is considered with defence)')
        }
    })

    app.get('/sqlinjection', function (req, res) {
        var db = new sqlite.Database('./sqlInjection.db')

        db.serialize(function () {
            var query = 'CREATE TABLE if not exists profiles (id INTEGER NOT NULL PRIMARY KEY, name varchar)'
            db.run(query)
        })
        var id = req.query.id, defence = req.query.defence
        if(defence === 'false'){
            var query = 'SELECT * from profiles WHERE id="' + id + '"'
            var idIsMalicous = query.indexOf('OR') > 0 || id.indexOf('"') > 0
            if (idIsMalicous) {
                db.all(query, function (err, people) {
                    res.send('You have successfully injected sql and there you have all the people in the table: ' + JSON.stringify(people))
                })
            }
            else {
                db.all(query, function (err, people) {
                    res.send('There is nothing malicous in what you inserted, the result is here: ' + JSON.stringify(people))
                })
            }
        }
        else {
            res.send('You wanted defence, so server blocked whatever it is you inserted (not specifying defence is considered with defence)')
        }

    })
}