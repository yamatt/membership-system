var express = require('express');
var _ = require("underscore");

module.exports = {
    "title": "Membership",
    "name": "membership",
    "app": function(config, db, site) {
        var app = express();
        
        _.extend(app.locals, site.locals);
        
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
                res.redirect("/"); // could probably be handled better or elsewhere
            }
        });
        
        app.post("/", function (req, res) {
            if (res.locals.user) {
                // update user
                var user = res.locals.user;
                user.name = req.body.name;
                user.address = req.body.address;
                user.card_id = req.body.card_id;
                
                user.save(function (err, user) {
                    res.render("membership", {user: user});
                });
            }
            else {
                // create user
                res.locals.User.create({
                    email: req.session.email,
                    name: req.body.name,
                    address: req.body.address,
                    card_id: req.body.card_id
                },
                function (err, user) {
                    res.render("membership", {user: user});
                });
            }
        });
        return app;
    }
}

