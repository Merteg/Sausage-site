const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mysql = require('mysql');
const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false })

app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(cookieParser());

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sausege_db'
});
connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});

app.get('/', (req, res) => {
    res.render('index');
});
app.get('/contacts', (req, res) => {
    res.render('contacts');
});
app.get('/products', (req, res) => {
    connection.query('SELECT * FROM `sausege`', function (error, results, fields) {
        if (error) throw error;
        res.render('products', {productArray: results});
    });
});
app.get('/products/:id', (req, res) => {
    let sql_query = 'SELECT * FROM `sausege` WHERE id_product = ' + connection.escape(req.params.id);
    connection.query(sql_query, function (error, results, fields) {
        if (error) throw error;
        res.render('single-product', results[0]);
    });
});
app.get('/login', (req, res) => {
    if("login" in req.cookies) res.redirect('/cabinet');
    else res.render('login');
});
app.get('/cabinet', (req, res) => {
    if("login" in req.cookies) res.render('cabinet', {rights: req.cookies.rights});
    else res.redirect('/login');
});
app.post('/cabinet', urlencodedParser, (req, res) => {
    if (!req.body) return res.sendStatus(400);
    connection.query("SELECT * FROM `users` WHERE email='" + req.body.email + "'", function (error, results, fields) {
        if (error) throw error;
        if(!results[0]) res.render('login', {err: "Введеного вами e-mail немає в базі даних"});
        else if(results[0].password == req.body.password) res.render('cabinet', results[0]);
        else res.render('login', {err: "Неправильно введений пароль"});
    });
});


app.use((req, res, next) => {
    res.status(404).render('404');
});
app.listen(3000);