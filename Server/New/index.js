var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mysql = require('mysql');
var userController = require('./server/userController');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'maiya',
  database : 'mercedes'
});
var FCM = require('fcm-push');

var serverKey = 'AAAA6z52zmI:APA91bFQaxkDzwO9oHJF_FsIjtSu34xrk181aO_GCIHni5NZKSI4R8zqfItW3xZNK2pQv1ORi9jX2NSOT6AD_EODmaywjYwLC4Q2lgrSaAcrot5CFzgOUgQzHZIbdw1GqZoozTD3MuwS';
var fcm = new FCM(serverKey);

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json())
app.use(morgan('dev'));


app.post('/requestForCharge', userController.requestForCharge);
app.post('/login', userController.login);
app.post('/register', userController.register);
app.post('/acceptRequest', userController.acceptRequest);
app.post('/backgroundLocation', userController.backgroundLocation);
app.post('/getHistory', userController.getHistory);
app.post('/getWithinDistance', userController.getWithinDistance);
app.post('/transaction', userController.transaction);

app.listen(8000, function(){
  console.log(8000);
})
