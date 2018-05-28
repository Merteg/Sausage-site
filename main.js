const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mysql = require('mysql');
const mailer = require('express-mailer');
const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false })

app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(cookieParser());

mailer.extend(app, {
    from: 'sausege-factory@sausege.com',
    host: 'smtp.gmail.com', // hostname
    secureConnection: true, // use SSL
    port: 465, // port for secure SMTP
    transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
    auth: {
        user: 'andrey8blak@gmail.com',
        pass: 'NissanSkyline'
    }
});
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sausege_db'
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
        res.render('products', { productArray: results });
    });
});
app.get('/products/:id', (req, res) => {
    let sql_query = 'SELECT * FROM `sausege` WHERE id_product = ' + connection.escape(req.params.id);
    connection.query(sql_query, function (error, results, fields) {
        if (error) throw error;
        res.render('single-product', results[0]);
    });
});
app.get('/cart', (req, res) => {
    let cart = {};
    let flag = false;
    for (const key in req.cookies) {
        if (/product\d/.test(key)) {
            cart[key.replace("product", "")] = req.cookies[key];
            flag = true;
        }
    }
    if (flag) {
        let sql_query = "SELECT * FROM `sausege` WHERE id_product = ";
        for (const key in cart) {
            sql_query = sql_query + key + " OR";
        }
        sql_query = sql_query.slice(0, -2);
        connection.query(sql_query, function (error, results, fields) {
            if (error) throw error;
            res.render('cart', { productArray: results, cookie: cart });
        });
    }
    else {
        res.render('cart');
    }
})
app.get('/login', (req, res) => {
    if ("login" in req.cookies) res.redirect('/cabinet');
    else res.render('login');
});
app.get('/cabinet', (req, res) => {
    if ("login" in req.cookies) {
        if (req.cookies.rights == "admin") {
            connection.query('SELECT * FROM `sausege`', function (error, results, fields) {
                if (error) throw error;
                var productArray = results;
                connection.query('SELECT * FROM `orders`', function (error, results, fields) {
                    if (error) throw error;
                    res.render('cabinet', { productArray: productArray, ordersArray: results, rights: req.cookies.rights });
                });
            });
        }
        else {
            res.render('cabinet', { rights: req.cookies.rights });
        }
    }
    else res.redirect('/login');
});
app.get('/edit', (req, res) => {
    if (req.cookies.rights == 'admin') {
        if ("id" in req.query) {
            let sql_query = 'SELECT * FROM `sausege` WHERE id_product = ' + connection.escape(req.query.id);
            connection.query(sql_query, function (error, results, fields) {
                if (error) throw error;
                res.render('edit', { product: results[0] });
            });
        }
        else res.render('edit');
    }
    else res.render('404');
});
app.get('/delete', (req, res) => {
    if (req.cookies.rights == 'admin'){
        if ("id" in req.query){
            if(req.query.type == "product"){
                let sql_query = 'DELETE FROM `sausege` WHERE id_product = ' + connection.escape(req.query.id);
                connection.query(sql_query, function (error, results, fields) {
                    if (error) throw error;
                    res.redirect('/cabinet');
                });
            }
            else if(req.query.type == "order"){
                let sql_query = 'DELETE FROM `orders` WHERE id_order = ' + connection.escape(req.query.id);
                connection.query(sql_query, function (error, results, fields) {
                    if (error) throw error;
                    res.redirect('/cabinet');
                });
            }
        }
        else res.redirect('/cabinet');
    }
    else res.render('404');
});
app.post('/cabinet', urlencodedParser, (req, res) => {
    if (!req.body) return res.sendStatus(400);
    connection.query("SELECT * FROM `users` WHERE email='" + req.body.email + "'", function (error, results, fields) {
        if (error) throw error;
        if (!results[0]) res.render('login', { err: "Введеного вами e-mail немає в базі даних" });
        else if (results[0].password == req.body.password) {
            if (results[0].rights == "admin") {
                info = results[0];
                connection.query('SELECT * FROM `sausege`', function (error, results, fields) {
                    if (error) throw error;
                    info.productArray = results;
                    connection.query('SELECT * FROM `orders`', function (error, results, fields) {
                        if (error) throw error;
                        info.ordersArray = results;
                        res.render('cabinet', info);
                    });
                });
            }
            else res.render('cabinet', results[0]);
        }
        else res.render('login', { err: "Неправильно введений пароль" });
    });
});
app.post('/order', urlencodedParser, (req, res) => {
    let login_user = req.cookies.login;
    connection.query("SELECT `email`, `id_user` FROM `users` WHERE login='" + login_user + "'", function (error, results, fields) {
        if (error) throw error;
        let user_email = results[0].email, user_id = results[0].id_user;
        let orderArr = [];
        let productsId = [];
        let orderObj = {};
        for (const key in req.cookies) {
            if (/product\d/.test(key)) {
                orderObj[key.replace("product", "")] = req.cookies[key];
                let d = new Date();
                d = formatDate(d);
                productsId.push(+key.replace("product", ""));
                orderArr.push("(" + user_id + ", " + key.replace("product", "") + ", " + req.cookies[key] + ", '" + d + "')");
            }
        }
        connection.query('INSERT INTO orders(id_user, id_product, count, order_date) VALUES ' + orderArr.join(" , "), (error, results, fields) => { if (error) throw error });
        productsId.forEach(item => {
            res.clearCookie("product" + item);
        });
        connection.query('SELECT * FROM `sausege` WHERE id_product=' + productsId.join(" OR "), (error, results, fields) => {
            if (error) throw error;
            app.mailer.send('email', {
                to: user_email,
                subject: 'Order at the Sausage Factory',
                counts: orderObj,
                otherProperty: results
            }, function (err) {
                if (err) {
                    console.log(err);
                    res.send('There was an error sending the email');
                    return;
                }
                res.redirect('/cart');
            });
        });
    });
});
app.post('/insert', urlencodedParser, (req, res) => {
    if (!req.body) return res.sendStatus(400);
    if (req.query.new == true) {
        let sql_query = "INSERT INTO `sausege`(name, description, count, price, img) VALUES ('" + req.body.name + "','" + req.body.description + "', " + req.body.count + ", " + req.body.price + ", '" + req.body.img + "')";
        connection.query(sql_query, function (error, results, fields) {
            if (error) throw error;
            res.redirect('/cabinet');
        });
    }
    else {
        let sql_query = "UPDATE `sausege` SET name='"+ req.body.name +"', description ='"+ req.body.description +"', count = "+ req.body.count + ", price= " + req.body.price + ", img='"+ req.body.img +"' WHERE id_product = " + req.query.id_p;
        connection.query(sql_query, function (error, results, fields) {
            if (error) throw error;
            res.redirect('/cabinet');
        });
    }
});

app.use((req, res, next) => {
    res.status(404).render('404');
});
app.listen(3000);

function formatDate(date) {

    var dd = date.getDate();
    if (dd < 10) dd = '0' + dd;

    var mm = date.getMonth() + 1;
    if (mm < 10) mm = '0' + mm;

    var yy = date.getFullYear() % 100;
    if (yy < 10) yy = '0' + yy;

    var hh = date.getHours();
    var mn = date.getMinutes();
    var ss = date.getSeconds();

    return yy + '-' + mm + '-' + dd + " " + hh + ":" + mn + ":" + ss;
}