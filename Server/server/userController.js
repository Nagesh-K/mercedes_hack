var mysql = require('mysql')
var routes = require('./directions')
var distanceAndCharge = require('./distanceAndCharge');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'maiya',
  database : 'mercedes'
});
var FCM = require('fcm-push');

var serverKey = 'AAAAwU1GTY8:APA91bHSPziJMQ2xnwVpxgLti0Q1gcmpJVOmxBhPx0ocZKJKrTGpQ9aBTaOPsSvYopyHt9zQ-yos9PpJMKX5qvwF2sGASQHpanSKg5RpoAXpW4ZS9bWEr9wD_6YZszdTUn6hU_W61ZAy';
var fcm = new FCM(serverKey);

module.exports.login = function(req, res){
  var data = JSON.parse(Object.keys(req.body));
  console.log(data)

  var userid = data.username;
  var password = data.password;
  var query = 'select password from user where username="'+userid+'"'
  connection.query(query, function (error, results, fields) {
  if (error) res.send(error);
  else {
    if(results[0]===undefined)
    res.send("Fail");
    else
    {
      console.log(results);
      if(results[0].password===password)
      {
        console.log("user "+data.username+" trying to log in...\n\n")
        var query = "select * from user u,cars c where u.username='"+data.username.toUpperCase()+"' and u.username=c.user"
        connection.query(query, function(err,results,fields) {
          if(err) {
            console.log(err);
            res.send("Fail");
          }
          else {
            console.log("pass");
            res.send(results);
          }
        });
      }
      else {
        res.send("Fail");
      }
      }
    }
  })
};

module.exports.register = function(req, res){
  console.log(req.body)
  var data = JSON.parse(Object.keys(req.body));
  console.log(data);
  //console.log(data);
  var userid = data.username;
  var password = data.password;
  var name = data.name.toUpperCase();
  var model = data.model.toUpperCase();
  var id = data.id.toUpperCase();
  var token = data.token;
  var lat = data.latitude||0;
  var lng = data.longitude||0;
  var statement = 'insert into user(username,password,name) values ("'+userid+'","'+password+'","'+name+'")';
  connection.query(statement, function (error, results, fields) {
  if (error){
    console.log(error)
    if(error['code']==='ER_DUP_ENTRY')
      res.send({success:false, msg:"Username already exists!"});
    }
  else {
    query = "insert into cars values('"+id+"','"+model+"','"+userid+"')";
    connection.query(query, function(err,results,f) {
      if(err) {
        console.log(err);
        res.send(false);
      }
      else {
        var query = "insert into devices values('"+userid+"','"+token+"')";
        connection.query(query, function(err,resukts, f) {
          if(err) {
            console.log(err);
            res.send(false);
          }
          else {
            var query = 'insert into locations values("'+id+'",'+lat+','+lng+')';
            connection.query(query, function(err, results, f) {
              if(err) {
                console.log(err);
                res.send(false);
              }
              else {
                console.log("Success!");
                res.send(true);
              }
            })
          }
        })
      }
    })
}
})
}

module.exports.requestForCharge = function(req,res) {
  //console.log(req.body);
  var data = JSON.parse(Object.keys(req.body));
  console.log("\n\n\n"+JSON.stringify(data)+"\n\n\n\n");
  var user = data.user;
  var charge = data.charge;
  var dest_lat = Number(data.dest_latitude);
  var dest_lng = Number(data.dest_longitude);
  var id = data.id;
  var dest_distance = data.distance;
  var query = 'select latitude,longitude from locations where id = "'+id+'"';
  connection.query(query, function(err, results, f) {
    if(err) {
      console.log(err);
      res.send(false);
    }
    else {
      var lat = results[0].latitude;
      var lng = results[0].longitude;
      var query = 'select l.latitude,l.longitude,d.token, c.id, c.user, u.name, ( 3959 * acos( cos( radians('+lat+') ) * cos( radians( l.latitude ) )  * cos( radians( l.longitude ) - radians('+lng+') ) + sin( radians('+lat+') ) * sin(radians(l.latitude)) ) ) AS distance  from locations l,cars c,devices d, user u where c.user=d.user and u.username=c.user and c.id = l.id and u.username<>"'+user+'" HAVING distance < 5 ORDER BY distance'
      connection.query(query, function(err, results, fields){
        if(err){
          console.log(err);
          res.send({success:false});
        }
        else {


          var len = results.length;
          console.log(len);
          console.log(user);
          console.log(lat);
          console.log(lng);
          for(var i=0;i<len;i++)
          {            
            var d = results[i];
            var dist = routes.getDistance(lat.toString()+','+lng.toString(),d.latitude.toString()+','+d.longitude.toString());
            console.log(dist);
            var ch = distanceAndCharge.distanceToCharge(dest_distance);
            var message = {
              "to": d.token, // required fill with device token or topics
              //collapse_key: 'your_collapse_key',
              "data": {
                user: user,
                charge: 100,
                latitude: lat,
                longitude: lng,
                distance: dist.rows[0].elements[0].distance.value.toString(),
                charge: ch.toString(),
                route: routes.cleanResults(val)
              },
              "notification": {
                title: 'Hey '+d.name+'!',
                body: user+' is asking for '+ch*100+' charge!',
                click_action: 'Accept_Request'
              }
            };
            fcm.send(message)
            .then(function(response){
              console.log("Successfully sent with response: ", response);
            })
            .catch(function(err){
              console.log("Something has gone wrong!");
              console.error(err);
            });
          }
          console.log("\n\n\nTrue\n\n\n");
          res.send({success:true});
        }
      })
    }
  })
}

module.exports.acceptRequest = function(req,res) {
  var data = JSON.parse(Object.keys(req.body));
  console.log(data);
  var donor = data.donor;
  //var lat_curr = data.latitude;
  //var lng_curr = data.longitude;
  var rec = data.recepient;
  var id = data.id;
  var recepient_charge = Number(data.recepient_charge);
  var donor_charge = Number(data.donor_charge);
  var donor_dest_lat = Number(data.donor_dest_lat);
  var donor_dest_lng = Number(data.donor_dest_lng);
  var recepient_dest_lat = Number(data.recepient_latitude);
  var recepient_dest_lng = Number(data.recepient_longitude);
  var query = 'select latitude,longitude from locations where id = "'+id+'"'
  connection.query(query, function(err,results,f) {
    if(err) {
      console.log(err);
      res.send(false);
    }
    else {
      var lat_curr = results[0].latitude;
      var lng_curr = results[0].longitude;
      var query = 'insert into charge_transfer(id, recepient, donor, recepient_charge, donor_charge) values(NULL, "'+rec+'","'+donor+'",'+recepient_charge+','+donor_charge+' )';
      connection.query(query, function(err,results,fields) {
        if(err) {
          console.log(err);
          res.send(false);
        }
        else {
          var query = 'select l.latitude, l.longitude from user u,cars c, locations l where u.username=c.user and c.id=l.id and u.username="'+rec+'"';
          connection.query(query, function(err,results,fields) {
            if(err) {
              console.log(err);
              res.send(false);
            }
            else {
              console.log(typeof(results[0].latitude.toString()));
              routes.routes(lat_curr, lng_curr, results[0].latitude.toString(), results[0].longitude.toString()).then(function(val) {
                //res.send(val);
                if(recepient_dest_lat) {
                  var lt = results[0].latitude;
                  var ln = results[0].longitude;
                  var recepient_dist = routes.getDistance(results[0].latitude.toString()+','+results[0].longitude.toString(), recepient_dest_lat+','+recepient_dest_lng).rows[0].elements[0].value;
                  var query = "SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'mercedes' AND   TABLE_NAME   = 'charge_transfer'";
                  connection.query(query, function(err,results,fields) {
                    if(err){console.log(err);res.send(false)}
                    else{
                      //console.log("FFFFFFFFFFFFFFFFFFFFFFFFF");
                      var charge = distanceAndCharge.distanceToCharge(recepient_charge);
                      console.log(results);
                      var id = results[0].AUTO_INCREMENT - 1;
                      var statement = "update charge_transfer set meeting_latitude="+lt+" , meeting_longitude="+ln+" , transfer_mah="+charge+" , completed='waiting' where id="+id;
                      connection.query(statement, function(err,results,fields) {
                        if(err) {
                          console.log(err);
                          res.send(false);
                        }
                        else {
                          var query = "select d.token from devices d,user u where u.username = d.user and u.username='"+rec+"'";
                          connection.query(query, function(err,results,fields) {
                            if(err) {
                              console.log(err);
                              res.send(false);
                            }
                            else {
                              console.log(results[0].token);
                              var dist = routes.getDistance(lt.toString()+','+ ln.toString(),lat_curr.toString()+','+lng_curr.toString() );
                              console.log();
                              console.log(routes.cleanResults(val));
                              var message = {
                                "to": results[0].token, // required fill with device token or topics
                                //collapse_key: 'your_collapse_key',
                                "data": {
                                  user: donor,
                                  latitude: lat_curr,
                                  longitude: lng_curr,
                                  route:routes.cleanResults(val),
                                  charge: distanceAndCharge.distanceToCharge(dist.rows[0].elements[0].distance.value).toString

                                },
                                "notification": {
                                  title: 'Good news!',
                                  body: donor+' is coming to save you ;)',
                                  click_action:"Request_Accepted"
                                }
                              };
                              fcm.send(message)
                              .then(function(response){
                                console.log("Successfully sent with response: ", response);
                                res.send({route:routes.cleanResults(val), success:true, distance: dist.toString(), id:id});
                              })
                              .catch(function(err){
                                console.log("Something has gone wrong!");
                                console.error(err);
                                res.send(false);
                              });
                            }
                          })
                        }
                      })
                    }
                  })
                }
              })
            }
          })
        }
      })

    }
  })

}

module.exports.backgroundLocation = function(req,res) {
  console.log(req.body);
  if(Object.keys(req.body).length === 0 && req.body.constructor === Object){
      var data = JSON.parse(Object.keys(req.body));
    res.send(false);
  }
  else{
  var  data = JSON.parse(Object.keys(req.body))
  //console.log(data);
  var lat = data.latitude || 0;
  var lng = data.longitude|| 0;
  var user = data.user;
  var query = "select id from cars where user='"+user+"'";
  connection.query(query, function(err,results,f) {
    if(err) {
      console.log(err);
      res.send(false);
    }
    else {
      if(!results[0].id) res.send("Not ready")
      var query = "update locations set latitude="+lat+" , longitude="+lng+" where id='"+results[0].id+"'";
      connection.query(query,function(err,results,f) {
        if(err) {
          console.log(err);
          res.send(false);
        }
        else {
          res.send(true);
        }
      })
    }
  })
}
}

module.exports.getHistory = function(req,res) {
  console.log(req.query);
  var data = req.query;
  var user = data.user;
  var query = "select * from charge_transfer where donor='"+user+"' or recepient='"+user+"'";
  connection.query(query, function(err,results,f) {
    if(err) {
      console.log(err);
      console.log("Fail");
    }
    else {
      console.log(results);
      res.send(results);
    }
  })
}

module.exports.getWithinDistance = function(req,res) {
  console.log(req.query);
  var data = req.query;
  var user = data.user;
  var query = 'select * from cars where user = "'+user+'"';
  connection.query(query, function(err,results,f) {
    if(err) {
      console.log(err);
      res.send(err);
    }
    else {
      var query = 'select latitude,longitude from locations where id="'+results[0].id+'"';
      connection.query(query, function(err,results,f) {
        if(err) {
          console.log(err);
          res.send(false);
        }
        else {
          var lat = results[0].latitude;
          var lng = results[0].longitude;
          var query = 'select l.latitude,l.longitude, c.user, u.name, ( 3959 * acos( cos( radians('+lat+') ) * cos( radians( l.latitude ) )  * cos( radians( l.longitude ) - radians('+lng+') ) + sin( radians('+lat+') ) * sin(radians(l.latitude)) ) ) AS distance  from locations l,cars c,devices d, user u where c.user=d.user and u.username=c.user and c.id = l.id and u.username<>"'+user+'" HAVING distance < 5 ORDER BY distance'
          connection.query(query, function(err,results,f) {
            if(err) {
              console.log(err);
              res.send(false);
            }
            else {
              res.send(results);
            }
          })
        }
      })
    }
  })
}

module.exports.transaction = function(req,res) {
  var data = JSON.parse(Object.keys(req.body));
  var donor = data.donor;
  var recepient = data.recepient;
  var transaction = data.transaction;
  var id = data.id;
  var query = "update user as u1, (select credit from user where username = '"+recepient+"') as u2 set u1.credit = u2.credit - "+transaction+" where u1.username = '"+recepient+"'"
  connection.query(query,function(err,results,f) {
    if(err) {
      console.log(err);
      res.send(false);
    }
    else {
      var query = "update user as u1, (select credit from user where username = '"+donor+"') as u2 set u1.credit = u2.credit + "+transaction+" where u1.username = '"+donor+"'"
      connection.query(query,function(err,results,f){
        if(err) {
          console.log(err);
          res.send(false);
        }
        else {
          query = "update charge_transfer set transaction="+transaction+" where id="+id;
          connection.query(query, function(err,results,f) {
            if(err) {
              console.log(err);
              res.send(false);
            }
            else {
              console.log("Transaction Success!");
              res.send("Transaction Success!")
            }
          })
        }
      })
    }
  })
}
