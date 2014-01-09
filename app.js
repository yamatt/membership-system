var express = require('express');
var _ = require("underscore");
var GoCardless = require('gocardless')

module.exports = {
    "title": "Membership",
    "name": "membership",
    "app": function(config, db, site) {
        var app = express();
        var gc = GoCardless(config.gocardless);
        
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
        
        app.get('/subscription-confirmation', function(req, res) {
            gc.confirmResource(req.query, function(err) {
                if (err) {
                    // better error messages
                    return res.send(402);
                }
                else {
                    if (req.query.resource_type == "subscription") {
                        // flash success message
                        var user = res.locals.user;
                        user.gc_subscription = req.query.resource_id;
                        user.save(function (err, user) {
                            // must handle validation errors
                            res.render("membership", {user: user});
                        });
                    }
                    else {
                        // something weird has happened.
                    }
                }
          });
        });
        
        app.post("/", function (req, res) {
            var user = res.locals.user;
            if ((user) && (req.body.subscribe == "Become Member")) {
                var url = gc.subscription.newUrl({
                  amount: req.body.subscription,
                  interval_length: '1',
                  interval_unit: 'month',
                  name: 'South London Makerspace Membership',
                  description: 'Monthly membership payment for South London Makerspace.'
                });

                res.redirect(url);
            }
            if ((user) && (req.body.subscribe == "Cancel Payment") && (user.gc_subscription)) {
                gc.subscription.cancel({
                  id: user.gc_subscription
                },
                function(err, response, body) {
                    if (!err) {
                        var r = JSON.parse(body);
                        if (r.status == "cancelled") {
                          user.gc_subscription = null
                          user.save(function (err, user) {
                              res.render("membership", {user: user});
                          });
                        }
                    }
                    else {
                        console.log("something went very wrong when cancelling a subscription.");
                    }
                });
            }
            
            
            if (user) {
                // update user
                var user = res.locals.user;
                user.name = req.body.name;
                user.address = req.body.address;
                user.card_id = req.body.card_id;
                
                user.save(function (err, user) {
                    // must handle validation errors
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
                    // must handle validation errors
                    res.render("membership", {user: user});
                });
            }
        });
        return app;
    }
}

