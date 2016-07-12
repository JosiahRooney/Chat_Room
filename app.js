var express = require("express");
var path = require("path");
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/static")));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');
app.get('/', function(req, res) {
    res.render("index");
});
app.post('/users', function(req, res) {
    res.redirect('/');
});

var server = app.listen(process.env.PORT || 6789, function() {
    console.log("listening on port 6789");
});

var io = require('socket.io').listen(server);
var messages = [];
var clients = [];

io.sockets.on('connection', function(socket) {
    socket.global_user = "";

    // Show users
    socket.on('get_users', function () {
        io.emit('update_users', clients);
    });

    // Send Message
    socket.on('send_message', function (user, message) {
        messages.push({user: user, message: message});
        io.emit('update_messages', {user: user, message: message});
    });

    // Show messages for all users
    socket.on('get_messages', function (message) {
        io.emit('update_messages', message);
    });

    // Show messages for one user
    socket.on('get_messages_single', function() {
        socket.emit('update_messages_single', messages);
    });

    // Login user
    socket.on('new_user', function (user) {
        socket.global_user = user.split(' ').join('_');
        clients.push(socket.global_user);
        socket.broadcast.emit('user_joined', socket.global_user);
    });

    socket.on('user_typing', function(user) {
        socket.broadcast.emit('user_typing_now', user.split(' ').join('_'));
    });

    socket.on('user_stopped_typing', function(user) {
        socket.broadcast.emit('user_not_typing', user.split(' ').join('_'));
    });

    // Logout user
    socket.on('disconnect', function () {
        var i = clients.indexOf(socket.global_user);
        if ( i != -1 ) {
            clients.splice(i, 1);
        }
        io.emit('update_users', clients);
    });
});
