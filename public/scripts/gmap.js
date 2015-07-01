////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Google Maps - Position Marker
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

google = google || { maps: {} };

google.maps.PositionMarker = function($scope, map, position, options) {

	options = options || {};
	options.icon = options.icon ? options.icon : 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
	options.title = options.title ? options.title : 'Position';

	this.$scope = $scope;


	this.geocoder = new google.maps.Geocoder();

	this.infoWindow = new google.maps.InfoWindow();

	google.maps.Marker.apply(this, {});

	this.setOptions({ position: position, map: map, title: options.title, icon: options.icon });

	var self = this;
	google.maps.event.addListener(self, 'click', function() {
		self.show();
	});

};

inherits(google.maps.PositionMarker, google.maps.Marker);

google.maps.PositionMarker.prototype.openInfoWindow = function() {

	if (this.infoWindow == this.$scope.openedInfoWindow) {
		return ;
	}

	if (this.$scope.openedInfoWindow) {
		this.$scope.openedInfoWindow.close();
	}

	this.$scope.openedInfoWindow = this.infoWindow;

	this.infoWindow.setContent(this.legend());

	this.infoWindow.open(this.map, this);

};

google.maps.PositionMarker.prototype.legend = function() {
	return "<b>Position" + '</b>' + (this.address() ? '<br>' + this.address() : '');
};

google.maps.PositionMarker.prototype.show = function() {
	var self = this;
	this.geocode(function() {
		self.openInfoWindow();
	});
};

google.maps.PositionMarker.prototype.geocode = function(done) {
	var self = this;

	if (self.geocoded) {
		done();
	}
	else {
		self.geocoder.geocode({ latLng: self.position }, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if (results[0]) {
					self.geocoded = true;
					self.geocodingInfos = results;

					done();
				}
			}
		});
	}
};

google.maps.PositionMarker.prototype.address = function() {
	return this.geocodingInfos ? _.pluck(this.geocodingInfos[0].address_components, 'long_name').join(', ') : "";
};

google.maps.StopMarker = function($scope, map, stop, options) {
	this.stop = stop;
	var stopPosition = new google.maps.LatLng(stop.geo_location.lat, stop.geo_location.lon);

	var options = { title: stop.name, icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' };
	google.maps.PositionMarker.apply(this, [$scope, map, stopPosition, options]);
};

inherits(google.maps.StopMarker, google.maps.PositionMarker);

google.maps.StopMarker.prototype.legend = function() {
	var stop = this.stop;
	var distance = (stop.distance / 1000).toFixed(3);
	var legend = '<b>' + stop.name.capitalize() + '</b> - <i><small>' + distance + ' km</small></i>' +
		(this.address() ? '<br>' + this.address() : '') + '<br>';

	legend += 'Lignes: <ul>' + _(stop.routes).uniq('name').map(function(route) {
			var background = route.route_color;
			var whiteBackground = !background || background == 'FFFFFF';
			var color = route.route_text_color;
			var name = route.name.substr(0, 3);
			var borderStyle = whiteBackground ? '1px solid #DDD' : '1px solid #' + background;
			return '<li class="sm-route" style="background: #' + background + '; color: #' + color + '; border: ' + borderStyle + '">' + name + '</span>';
		}).join('') + '</ul>';

	return legend;
};

