var express = require('express');
module.exports = {
    "title": "Membership",
    "name": "membership",
    "app": function() {
        var app = express();

        app.get('/', function(req, res){
          res.send('Hello app');
        });
        return app;
    }
}

