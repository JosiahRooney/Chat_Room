var express = require("express");
var path = require("path");
var app = express();
var moment = require('moment');

app.use(express.static(path.join(__dirname, "/static")));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use('/static', express.static(__dirname + '/static'));
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
var clients = {};

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "/": '&#x2F;'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>\/]/g, function (s) {
        return entityMap[s];
    });
}

io.sockets.on('connection', function(socket) {
    socket.global_user = "";

    // Show users
    socket.on('get_users', function () {
        io.emit('update_users', clients);
    });

    // Send Message
    socket.on('send_message', function (data) {
        var now = moment().format('MMMM Do YYYY hh:mm:ss a');
        messages.push({user: data.user, message: escapeHtml(data.message), created_at: now});
        clean_msg = escapeHtml(data.message);
        io.emit('update_messages', {user: data.user, message: clean_msg, created_at: now});
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
        socket.global_user = user.split(' ').join('_').split('.').join('');
        clients[socket.id] = socket.global_user;
        socket.broadcast.emit('user_joined', socket.global_user);
    });

    socket.on('user_typing', function(user) {
        socket.broadcast.emit('user_typing_now', user.split(' ').join('_').split('.').join(''));
    });

    socket.on('user_stopped_typing', function(user) {
        socket.broadcast.emit('user_not_typing', user.split(' ').join('_').split('.').join(''));
    });

    // Logout user
    socket.on('disconnect', function () {
        delete clients[socket.id];
        io.emit('update_users', clients);
        io.emit('user_left', socket.global_user);
    });
});
