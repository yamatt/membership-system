var express = require('express');
module.exports = {
    "title": "Membership",
    "name": "membership",
    "app": function(db, site, config) {
        var app = express();

        app.get('/', function(req, res){
          res.render("base");
        });
        return app;
    }
}

