var express = require('express'),
    _ = require("underscore"),
    GoCardless = require('gocardless');

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
        
        app.locals.data = {
            page_title: "Membership"
        }

        app.get('/', function(req, res){
            if (req.session.email) {
                res.render("membership");
            }
            else {
                res.locals.flash("danger", "Not logged in.", "Please log in to access the members page.");
                res.redirect("/"); // could probably be handled better or elsewhere
            }
        });
        
        app.get('/subscription-confirmation', function(req, res) {
            var user = res.locals.user;
            gc.confirmResource(req.query, function(err) {
                if (err) {
                    // better error messages
                    return res.send(402);
                }
                else {
                    if (req.query.resource_type == "subscription") {
                        if (user) {
                            user.gc_subscription = req.query.resource_id;
                            user.save(function (err, user) {
                                if (!err) {
                                    res.locals.flash("success", "Subscription created.", "Your subscription from GoCardless has been created. Waiting for payment.");
                                }
                                else {
                                    console.log("Could not save entry because: " + err);
                                    console.log("Data: " + user);
                                    res.send(500, "Database error. This has been logged but please report the issue with the code SLME001");
                                }
                            });
                        }
                        else {
                            res.locals.flash("danger", "Subscription failed.", "Your subscription from GoCardless could not be created as you are not logged in to this site. You may need to cancel your subscription with GoCardless and recreate it from this site making sure you are logged in.");
                            console.log("User was not logged in when creating subscription: " + req.query.resource_id);
                        }
                    }
                    else {
                        res.locals.flash("success", "Subscription failed.", "Created bill appears to be something other than a subscription.");
                        console.log("User '" + user + "'attemped to create something other than a subscription: " + req.query.resource_id);
                    }
                    res.redirect("/membership");
                }
          });
        });
        
        app.post("/", function (req, res) {
            var user = res.locals.user;
            if ((user) && (req.body.subscribe == "Become Member")) {
                if (parseFloat(req.body.subscription) >= config.gocardless.minimum) {
                    var url = gc.subscription.newUrl({
                      amount: req.body.subscription,
                      interval_length: '1',
                      interval_unit: 'month',
                      name: 'South London Makerspace Membership',
                      description: 'Monthly membership payment for South London Makerspace.',
                      user: {
                          "email": user.email
                      }
                    });
                    res.redirect(url);
                }
                else {
                    res.locals.flash("warning", "Subscription failed.", "Please enter a value greater than £" + config.gocardless.minimum + "."); // TODO: configurable currency symbol
                }
            }
            else if ((user) && (req.body.subscribe == "Cancel Payment") && (user.gc_subscription)) {
                gc.subscription.cancel({
                  id: user.gc_subscription
                },
                function(err, response, body) {
                    if (!err) {
                        var r = JSON.parse(body);
                        if (r.status == "cancelled") {
                            user.cancel_subscription();
                            user.save(function (err, user) {
                                if (!err) {
                                    res.locals.flash("warning", "Subscription cancelled.", "Your subscription has been cancelled and your account updated.");
                                    res.render("membership", {user: user});
                                }
                                else {
                                    console.log("Could not save entry because: " + err);
                                    console.log("Data: " + user);
                                    res.send(500, "Database error. This has been logged but please report the issue with the code SLME002.");
                                }
                            });
                            console.log("Subscription cancelled for user: " + user);
                        }
                    }
                    else {
                        res.locals.flash("danger", "Subscription cancel failed.", "Your subscription has been cancelled could not be cancelled possibly due to a failure on GoCardless's side.");
                        console.log("something went very wrong when cancelling a subscription for user: " + user);
                    }
                });
            }
            else if (user) {
                // update user
                var user = res.locals.user;
                user.name = req.body.name;
                user.address = req.body.address;
                user.card_id = req.body.card_id;
                
                user.isValid(function (valid) {
                    if (valid) {
                        user.save(function (err, user) {
                            // must handle validation errors
                            if (!err) {
                                res.locals.flash("success", "Updated.", "Member account updated successfully.");
                                res.render("membership", {user: user});
                            }
                            else {
                                console.log("Could not save entry because: " + err);
                                console.log("Data: " + user);
                                res.send(500, "Database error. This has been logged but please report the issue with the code SLME003.");
                            }
                        });
                    }
                    else {
                        res.locals.flash("danger", "Update failed.", "Member information could not be saved because of errors.");
                        res.render("membership", {user: user, errors: user.errors});
                    }
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
                    if (!err) {
                        res.locals.flash("success", "Account created.", "Thanks! You can now create a payment subscription.");
                        res.render("membership", {user: user});
                    }
                    else {
                        res.locals.flash("danger", "Account creation failed.", "Member information could not be created because of errors.");
                        res.render("membership", {user: user, errors: user.errors});
                    }
                });
            }
        });
        return app;
    }
}

