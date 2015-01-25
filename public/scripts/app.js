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

gtfsApp.factory('Globals', function($rootScope) {

    var availableConfigs = [
	    {
		    dataset: 'RATP_GTFS_FULL',
		    distance: 1000,
	        center: { latitude: 48.814593, longitude: 2.4586253 },
		    locations: 1
	    }, {
		    dataset: 'STAR_GTFS_RENNES',
		    distance: 1000,
		    center: { latitude: 48.1089, longitude: -1.47798 },
		    locations: 1,
		    stopId: '4152'
	    }
    ];

	var globals =  {
		date: moment().format("YYYY-MM-DD"),
		baseURL: window.location.protocol + '//' + window.location.host,
		availableConfigs: availableConfigs,
		DEFAULT_CONFIG_KEY: 'RATP_GTFS_FULL'
	};

	globals.selectConfig = function(agencyKey) {
		globals.config = _.find(availableConfigs, function(config) {
			return config.dataset == agencyKey
		});

		if (!globals.position) {
			globals.position = { coord: globals.config.center };
		}

		$rootScope.$broadcast('config', globals.config);
	};

	globals.setPosition = function(position) {
		globals.position = position;

		$rootScope.$broadcast('position', position);
	};

	console.log("Globals: " + JSON.stringify(globals));

	return globals;
});

gtfsApp.factory('AgencyService', function($http, $q, Globals) {
	var agencyService = {};

	agencyService.findMatchingAgencyByPosition = function(position) {
		var defer = $q.defer();

		var url = Globals.baseURL + '/api/agencies/nearest?lat=' + position.coords.latitude + '&lon=' + position.coords.longitude;

		$http.get(url).success(function (agency, status, headers, config) {
			defer.resolve(agency);
		}).error(function (data, status, headers, config) {
			defer.reject(new Error('HTTP error[' + status + ']'));
		});

		return defer.promise;
	};

	return agencyService;
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
		var selectedDate = moment(Globals.date, 'YYYY-MM-DD');

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

	stopService.fetchNearestStops = function(dataset, lat, lon, distance, locations) {

		var defer = $q.defer();

		var url = Globals.baseURL + '/api/agencies/' + dataset + '/stops/' + Globals.date + '/nearest?lat=' + lat + '&lon=' + lon + '&distance=' + distance + '&locations=' + locations;

		$http.get(url).success(function (stops, status, headers, config) {
			defer.resolve(stops);
		}).error(function (data, status, headers, config) {
			defer.reject(new Error('HTTP error[' + status + ']'));
		});

		return defer.promise;
	};

	return stopService;
});

gtfsApp.factory('LineService', function($http, $q, Globals) {
	var lineService = { };

	lineService.fetchStopTimes = function(dataset, stopId, date) {
		var defer = $q.defer();

		var url = Globals.baseURL + '/api/agencies/' + dataset + '/stop-times-full/' + stopId + '/' + date;

		$http.get(url).success(function (lines, status, headers, config) {
			lines.forEach(function(line) {
				line.stop_times = _.sortBy(line.stop_times, 'arrival_time');
			});

			defer.resolve(lines);
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
	$scope.date = moment(Globals.date, "YYYY-MM-DD").format("DD/MM/YYYY");
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

gtfsApp.controller('StopsController', function($rootScope, $scope, $q, Globals, StopService) {

	$scope.stops = [];

	$rootScope.$on('config', function(event) {
		$scope.fetchNearestStops();
	});

	$scope.fetchNearestStops = function() {
		var config = Globals.config;
		var position = Globals.position;

		StopService.fetchNearestStops(config.dataset, position.coords.latitude, position.coords.longitude, config.distance, config.locations).then(function(stops) {
			$scope.stops = stops;
		}).catch(function(err) {
			console.log(err);
		});
	};

});

gtfsApp.controller('StopController', function($rootScope, $scope, Globals, LineService) {

	$scope.stopSelect = function() {
		console.log("Stop selected: " + $scope.stop.stop_id);
	};

});

gtfsApp.controller('StopLinesController', function($scope) {

});

gtfsApp.controller('StopLineController', function($rootScope, $scope, Globals, TripService) {

});

gtfsApp.controller('MapController', function($rootScope, $scope, $q, Globals, AgencyService, StopService) {

	$scope.stops = [];

	var config = Globals.config;


	////////////////////////////////////////////////////////////////////////////////////////////////////////
	/// Map Init
	////////////////////////////////////////////////////////////////////////////////////////////////////////

	var agencyCenter = Globals.availableConfigs[0].center;
	var map = new google.maps.Map(document.getElementById('map-canvas'), { zoom: 17, center: { lat: agencyCenter.latitude, lng: agencyCenter.longitude } });

	$rootScope.$on('redrawMapEvent', function(event) {
		google.maps.event.trigger(map,'resize');
	});

	$rootScope.$on('position', function(event, position) {
		AgencyService.findMatchingAgencyByPosition(position).then(function(agency) {
			Globals.selectConfig(agency ? agency.agency_key : Globals.DEFAULT_CONFIG_KEY);
		}).catch(function(err) {
			console.log("Error:" + JSON.stringify(err));
			Globals.selectConfig(Globals.DEFAULT_CONFIG_KEY);
		});
	});

	$rootScope.$on('config', function(event) {
		var position = Globals.position;
		$scope.initializeMap(new google.maps.LatLng(position.latitude, position.longitude));
	});

	$scope.initialize = function() {
		if (Modernizr.geolocation) {
			var geoLocationOptions = { enableHighAccuracy: false, maximumAge: 75000 };
			navigator.geolocation.getCurrentPosition($scope.onGeoLocationSuccess, $scope.onGeoLocationError, geoLocationOptions);
		}
		else {
			Global.setPosition(undefined);
		}
	};

	$scope.onGeoLocationSuccess = function(position) {
		Globals.setPosition(position);
	};

	$scope.onGeoLocationError = function handle_error(err) {
		if (err.code == 1) {
			console.log("User refused acces to geolocation");
		}
		else {
			console.log("GeoLocation Error: " + JSON.stringify(err));
		}

		Globals.setPosition(undefined);
	};

	$scope.initializeMap = function() {

		var position = Globals.position;
		var config = Globals.config;

		StopService.fetchNearestStops(config.dataset, position.coords.latitude, position.coords.longitude, config.distance, config.locations).then(function(stops) {

			$scope.stops = _.values(_.groupBy(stops, function(stop) {
				return stop.stop_name + stop.stop_desc + stop.location_type;
			})).map(function(stops) {
				return {
					stop_name: stops[0].stop_name,
					stop_desc: stops[0].stop_desc,
					stop_geo: stops[0].stop_geo,
					stop_distance: stops[0].stop_distance,
					stop_lat: stops[0].stop_lat,
					stop_lon: stops[0].stop_lon,
					stop_ids: _.pluck(stops, 'stop_id')
				};
			});


			////////////////////////////////////////////////////////////////////////////////////////////////////////
			/// Position Marker
			////////////////////////////////////////////////////////////////////////////////////////////////////////

			map.panTo({ lat: position.coords.latitude, lng: position.coords.longitude });
			var positionMarker = new google.maps.PositionMarker($scope, map, { lat: position.coords.latitude, lng: position.coords.longitude });

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
