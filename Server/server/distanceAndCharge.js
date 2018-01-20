module.exports.distanceToCharge = function(distance) {
  return distance*1000/500000;
}

module.exports.chargeToDistance = function(charge) {
  return charge*500000/1000
}
