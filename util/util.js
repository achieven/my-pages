const Handlebars = require('handlebars')

Handlebars.registerHelper('equal', function(v1, v2, options) {
    if(v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});