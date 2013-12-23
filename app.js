var express = require('express');
module.exports = {
    "title": "Membership",
    "name": "membership",
    "app": function(db, site, config) {
        var app = express();
        
        app.set('views', __dirname + "/views");
        app.use(express.csrf());
        app.use(function (req, res, next) {
            res.locals.token = req.csrfToken();
            next();
        });

        app.get('/', function(req, res){
            if (req.session.email) {
                res.render("membership");
            }
            else {
                res.redirect("/"); // should probably be handled better or elsewhere
            }
        });
        return app;
    }
}

