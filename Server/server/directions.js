const request = require('request');
var sync_request = require('sync-request');

module.exports.routes = function(s_lat,s_lng,d_lat,d_lng){
	/*var str = 'https://maps.googleapis.com/maps/api/directions/json?origin='+s_lat+','+s_lng+'&destination='+d_lat+','+d_lng+'&key=%20AIzaSyBeIMYsylRD29DrYbcQWq3NGzVHzCMFbEY'
	str = encodeURI(str)
	//console.log(str);
	var res = request('GET',str);
	var ans = res.getBody()
	return JSON.parse(ans);*/
	return new Promise(function(fullfil, reject){
		console.log('https://maps.googleapis.com/maps/api/directions/json?origin='+s_lat+','+s_lng+'&destination='+d_lat+','+d_lng+'&key=%20AIzaSyBeIMYsylRD29DrYbcQWq3NGzVHzCMFbEY');
	request('https://maps.googleapis.com/maps/api/directions/json?origin='+s_lat+','+s_lng+'&destination='+d_lat+','+d_lng+'&key=%20AIzaSyBeIMYsylRD29DrYbcQWq3NGzVHzCMFbEY', { json: true }, (err, res, 	body) => {
  		if (err) { console.log("err");reject(err); }
		fullfil(body);
	});
});
}

module.exports.getDistance = function(s,d) {
		str = 'https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins='+s+'&destinations='+d+'&key=AIzaSyBeIMYsylRD29DrYbcQWq3NGzVHzCMFbEY';
		str = encodeURI(str)
		//console.log(str);
		var res = sync_request('GET',str);
		var ans = res.getBody()
		return JSON.parse(ans);
}

module.exports.cleanResults = function(route) {
	var route = route.routes[0].legs[0].steps;
	var len = route.length;
	var res = [];
	for(i=0;i<len;i++) {
		res.push({start_location:route[i].start_location,end_location:route[i].end_location});
	}
	return res;
}

//arguements: source destination, source longitude, destination latitude, destination longitude, result
