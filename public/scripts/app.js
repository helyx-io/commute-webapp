$(document).foundation();


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var gtfsApp = angular.module('gtfsApp', [/*'ngAnimate', 'mwl.bluebird'*/]);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Helper functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function inherits(childCtor, parentCtor) {
	/* @constructor */
	function tempCtor() {}
	tempCtor.prototype = parentCtor.prototype;
	childCtor.superClass_ = parentCtor.prototype;
	childCtor.prototype = new tempCtor();
	/* @override */
	childCtor.prototype.constructor = childCtor;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

gtfsApp.factory('Globals', function() {

//        var config = { // St-Maurice
//            dataset: 'RATP_GTFS_FULL',
//            date: '2014-12-20' +
//            '', // moment().format("YYYY-MM-DD")
//            geo: {
//                lat: 48.814593,
//                lon: 2.4586253
//            },
//            distance: 1000,
//            locations: 1,
//            ignoreDay: 1
//        };

	var config = { // Renne
		dataset: 'STAR_GTFS_RENNES',
		date: '2015-01-15', // moment().format("YYYY-MM-DD")
		geo: {
			lat: 48.1089,
			lon: -1.47798
		},
		distance: 1000,
		locations: 1,
		ignoreDay: 0,
		stopId: '4152'
	};

	return {
		baseURL: location.hostname == 'localhost' ? 'http://localhost:9000' : 'http://gtfs.helyx.io',
		config: config
	};
});

gtfsApp.factory('CalendarService', function($http, $q, Globals) {
	var calendarService = {};

	var daysOfWeek = {
		1: "Monday",
		2: "Tuesday",
		3: "Wednesday",
		4: "Thursday",
		5: "Friday",
		6: "Saturday",
		7: "Sunday"
	};

	calendarService.dayOfWeekAsString = function(day) {
		return daysOfWeek[day];
	};

	calendarService.buildCalendar = function() {

		var defer = $q.defer();

		// Make it comparable with other built dates
		var today = moment(moment().format('YYYY-MM-DD'), 'YYYY-MM-DD');
		var selectedDate = moment(Globals.config.date, 'YYYY-MM-DD');

		var startOfCalendar = moment(today).add(-10, 'days');

		var days = [];

		var day = moment(startOfCalendar);
		for (var i = 0 ; i < 100 ; i++) {
			var dayClass = day.isSame(today) ? 'today' : (day.isSame(selectedDate) ? 'selected': '');
			days.push({ day: day.format('D'), weekDay: calendarService.dayOfWeekAsString(day.format('E')), date: day, _class: dayClass });
			day = moment(day).add(1, 'days');
		}

		defer.resolve(days);

		return defer.promise;
	};

	return calendarService;
});

gtfsApp.factory('StopService', function($http, $q, Globals) {
	var stopService = { };

	stopService.fetchStops = function(dataset, lat, lon, distance, locations) {

		if (stopService.stops) {
			var defer = $q.defer();
			defer.resolve(stopService.stops);
			return defer.promise;
		} else if (stopService.defer) {
			return stopService.defer.promise;
		}
		else {
			stopService.defer = $q.defer();

			var url = Globals.baseURL + '/api/agencies/' + dataset + '/stops/nearest?lat=' + lat + '&lon=' + lon + '&distance=' + distance + '&locations=' + locations;

			$http.get(url).success(function (stops, status, headers, config) {
				stopService.stops = stops;
				stopService.defer.resolve(stops);
			}).error(function (data, status, headers, config) {
				stopService.defer.reject(new Error('HTTP error[' + status + ']'));
			});
		}

		return stopService.defer.promise;
	};

	return stopService;
});

gtfsApp.factory('LineService', function($http, $q, Globals) {
	var lineService = { };

	lineService.fetchStopTimes = function(dataset, stopId, date, ignoreDay) {
		var defer = $q.defer();

		var url = Globals.baseURL + '/api/agencies/' + dataset + '/stop-times-full/' + stopId + '/' + date + '?ignoreDay=' + ignoreDay;

		$http.get(url).success(function (stopTimes, status, headers, config) {
			defer.resolve(stopTimes);
		}).error(function (data, status, headers, config) {
			defer.reject(new Error('HTTP error[' + status + ']'));
		});

		return defer.promise;
	};

	return lineService;

});

gtfsApp.factory('TripService', function($http, $q, Globals) {
	var tripService = { };

	tripService.fetchStopTimes = function(dataset, tripId) {

		var defer = $q.defer();

		var url = Globals.baseURL + '/api/agencies/' + dataset + '/trips/' + tripId + '/stop-times';

		$http.get(url).success(function (stopTimes, status, headers, config) {
			defer.resolve(stopTimes);
		}).error(function (data, status, headers, config) {
			defer.reject(new Error('HTTP error[' + status + ']'));
		});

		return defer.promise;
	};

	return tripService;
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Position Marker
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
	google.maps.event.addListener(this, 'click', function() {
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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Position Marker
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

google.maps.StopMarker = function($scope, map, stop, options) {
	this.stop = stop;
	var stopPosition = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);

	var options = { title: stop.stop_name, icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' };
	google.maps.PositionMarker.apply(this, [$scope, map, stopPosition, options]);
};

inherits(google.maps.StopMarker, google.maps.PositionMarker);

google.maps.StopMarker.legend = function() {
	var distance = (stop.stop_distance / 1000).toFixed(3);
	return '<b>' + stop.stop_name + '</b> - <i><small>' + distance + ' km</small></i>' + (stop.address ? '<br>' + stop.address : '');
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Controllers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

gtfsApp.controller('AppController', function($rootScope, $scope, Globals) {
	$scope.showLeftSidebar = true;
	$scope.showRightSidebar = true;


	$scope.toggleLeftSidebar = function() {
		$scope.showLeftSidebar = !$scope.showLeftSidebar;

		var sidebarLeft = angular.element('#sidebar-left');
		var mainContent = angular.element('#main-content');

		if ($scope.showLeftSidebar) {
			mainContent.removeClass('left-full');
			sidebarLeft.removeClass('hidden');
		} else {
			mainContent.addClass('left-full');
			sidebarLeft.addClass('hidden');
		}

		$rootScope.$broadcast('redrawMapEvent');
	};

	$scope.toggleRightSidebar = function() {
		$scope.showRightSidebar = !$scope.showRightSidebar;

		var sidebarRight = angular.element('#sidebar-right');
		var mainContent = angular.element('#main-content');

		if ($scope.showRightSidebar) {
			mainContent.removeClass('right-full');
			sidebarRight.removeClass('hidden');
		} else {
			mainContent.addClass('right-full');
			sidebarRight.addClass('hidden');
		}

		$rootScope.$broadcast('redrawMapEvent');
	};

});

gtfsApp.controller('HeaderController', function($scope, Globals) {
	$scope.date = moment(Globals.config.date, "YYYY-MM-DD").format("DD/MM/YYYY");
});

gtfsApp.controller('SettingsController', function($scope, Globals) {

	$scope.toggleLeftSidebar = function() {
		$scope.$parent.toggleLeftSidebar();

		var btnCalendar = angular.element('#btn-calendar');

		if ($scope.showLeftSidebar) {
			btnCalendar.addClass('selected')
		} else {
			btnCalendar.removeClass('selected')
		}
	};

	$scope.toggleRightSidebar = function() {
		$scope.$parent.toggleRightSidebar();

		var btnStops = angular.element('#btn-stops');

		if ($scope.showRightSidebar) {
			btnStops.addClass('selected')
		} else {
			btnStops.removeClass('selected')
		}
	};
});

gtfsApp.controller('MainController', function($scope, Globals) {

	var mapElt = angular.element("#map");
	var stopsElt = angular.element('#stops');

	$scope.toggleMapVisibility = function() {
		if (stopsElt.hasClass('stop-hidden')) {
			stopsElt.removeClass('stop-hidden');
			mapElt.addClass('map-hidden');
		} else {
			stopsElt.addClass('stop-hidden');
			mapElt.removeClass('map-hidden');
		}
	};
});

gtfsApp.controller('SidebarCalendarController', function($scope, CalendarService) {
	$scope.days = [];

	CalendarService.buildCalendar().then(function(days) {
		$scope.days = days;
	});
});

gtfsApp.controller('SidebarStopsController', function($scope, $http, Globals, StopService) {

	$scope.stops = [];

	var config = Globals.config;

	StopService.fetchStops(config.dataset, config.geo.lat, config.geo.lon, config.distance, config.locations).then(function(stops) {
		$scope.stops = stops;

		$scope.stops.forEach(function (stop, index) {
			stop.index = index;
			stop._class = stop.stop_id == config.stopId ? 'selected' : '';
			stop.stop_loc_link = 'https://maps.google.com/maps?q=' + stop.stop_lat + ',' + stop.stop_lon
		});

	}).catch(function(err) {
		console.log(err);
	});

});

gtfsApp.controller('StopsController', function($scope, Globals, $q, StopService, LineService) {

	$scope.stops = [];

	var config = Globals.config;

	StopService.fetchStops(config.dataset, config.geo.lat, config.geo.lon, config.distance, config.locations).then(function(stops) {
		$scope.stops = stops;
	}).catch(function(err) {
		console.log(err);
	});

});

gtfsApp.controller('StopController', function($scope, Globals, LineService) {

	var config = Globals.config;

	LineService.fetchStopTimes(config.dataset, $scope.stop.stop_id, config.date, config.ignoreDay).then(function(lines) {
		lines.forEach(function(line) {
			if (line.stop_times.length > 0) {
				line.trip_id = line.stop_times[0].trip_id;
				line.route_color = line.stop_times[0].route_color;
				line.route_text_color = line.stop_times[0].route_text_color;
			}
		});

		$scope.stop.lines = lines;
	});
});

gtfsApp.controller('StopLinesController', function($scope) {

});

gtfsApp.controller('StopLineController', function($scope, Globals, TripService) {

	var config = Globals.config;

	TripService.fetchStopTimes(config.dataset, $scope.line.trip_id).then(function(stopTimes) {
		$scope.line.first_stop = stopTimes[0].stop;
		$scope.line.last_stop = stopTimes[stopTimes.length - 1].stop;
	}).catch(function(err) {
		console.log(err);
	});

});

gtfsApp.controller('MapController', function($rootScope, $scope, $q, Globals, StopService) {

	$scope.stops = [];

	var config = Globals.config;

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	/// Map Init
	////////////////////////////////////////////////////////////////////////////////////////////////////////

	var position = new google.maps.LatLng(Globals.config.geo.lat, Globals.config.geo.lon);

	var map = new google.maps.Map(document.getElementById('map-canvas'), { zoom: 17, center: position });

	$rootScope.$on('redrawMapEvent', function() {
		google.maps.event.trigger(map,'resize')
	});

	$scope.initialize = function() {

		StopService.fetchStops(config.dataset, config.geo.lat, config.geo.lon, config.distance, config.locations).then(function(stops) {

			$scope.stops = stops;

			////////////////////////////////////////////////////////////////////////////////////////////////////////
			/// Position Marker
			////////////////////////////////////////////////////////////////////////////////////////////////////////

			var positionMarker = new google.maps.PositionMarker($scope, map, position);

			positionMarker.show();


			////////////////////////////////////////////////////////////////////////////////////////////////////////
			/// Stops Markers
			////////////////////////////////////////////////////////////////////////////////////////////////////////

			$scope.stops.forEach(function(stop) {
				new google.maps.StopMarker($scope, map, stop);
			});


		}).catch(function(err) {
			console.log(err);
		});

	};

	google.maps.event.addDomListener(window, 'load', $scope.initialize);

});
