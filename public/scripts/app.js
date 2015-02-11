$(document).foundation();

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var gtfsApp = angular.module('gtfsApp', [/*'ngAnimate', 'mwl.bluebird'*/]);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Helper functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function inherits(ctor, superCtor) {
	ctor.super_ = superCtor;
	var TempCtor = function () {};
	TempCtor.prototype = superCtor.prototype;
	ctor.prototype = new TempCtor();
	ctor.prototype.constructor = ctor;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

gtfsApp.factory('Globals', function($rootScope) {

	var globals =  {
		date: moment().format("YYYY-MM-DD"),
		baseURL: window.location.protocol + '//' + window.location.host,
		distance: 1000,
		DEFAULT_POSITION: { latitude: 48.859377, longitude: 2.331751 }
	};


	var urlParams = {};

	(function () {
		var match,
			pl     = /\+/g,  // Regex for replacing addition symbol with a space
			search = /([^&=]+)=?([^&]*)/g,
			decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
			query  = window.location.search.substring(1);

		while (match = search.exec(query))
			urlParams[decode(match[1])] = decode(match[2]);
	})();

	if (urlParams.lat && urlParams.lon) {
		globals.qsPosition = { coords: { latitude: Number(urlParams.lat), longitude: Number(urlParams.lon) } };
	}

	if (urlParams.distance) {
		globals.distance = Number(urlParams.distance);
	}

	globals.selectAgencies = function(agencies) {
		globals.agencies = agencies;

		if (!globals.position && globals.agencies && globals.agencies.length > 0) {
			globals.position = {
				coord: {
					latitude: (global.agencies[0].agency_min_lat + global.agencies[0].agency_max_lat) / 2,
					longitude: (global.agencies[0].agency_min_lon + global.agencies[0].agency_max_lon) / 2
				}
			};
		}

		$rootScope.$broadcast('agencies', globals.agencies);
	};


	globals.setPosition = function(position) {
		globals.position = position;

		$rootScope.$broadcast('position', position);
	};


	console.log("Globals: " + JSON.stringify(globals));


	return globals;
});

gtfsApp.run(function($rootScope, Globals, AgencyService, StopService) {


	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/// Root scope event listeners
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	$rootScope.$on('position', function(event, position) {
		AgencyService.findMatchingAgencyByPosition(position).then(function(agencies) {
			Globals.selectAgencies(agencies);
		}).catch(function(err) {
			console.log("Error:" + JSON.stringify(err));
		});
	});


	$rootScope.$on('agencies', function(event, agencies) {
		var position = Globals.position;

		$rootScope.$broadcast('stopsReset');
		_(agencies).pluck('agency_key').uniq().forEach(function (agencyKey) {
			StopService.fetchNearestStops(agencyKey, position.coords.latitude, position.coords.longitude, Globals.distance).then(function(stops) {

				var now = moment();

				for (var stop of stops) {
					for (var line of stop.lines) {
						if (!line.name) {
							line.name = 'N/A';
						}

						line.name = line.name.substr(0, 3);

						line.stop_times = _.chain(line.stop_times)
						.filter(function(stopTime) {
							return moment(stopTime.arrival_time, 'HH:mm:ss').isAfter(now);
						})
						.sortBy(function(stopTime) {
							return stopTime.arrival_time;
						})
						.map(function(stopTime) {
							stopTime.departure_time = stopTime.departure_time.indexOf('24') == 0 ? '00' + stopTime.departure_time.substr(2) : stopTime.departure_time;
							stopTime.arrival_time = stopTime.arrival_time.indexOf('24') == 0 ? '00' + stopTime.arrival_time.substr(2) : stopTime.arrival_time;

							return stopTime;
						})
						.value();

						line.stop_times = line.stop_times.slice(0, 10);
					}

					stop.lines = _.filter(stop.lines, function(line) {
						return line.stop_times.length > 0;
					});
				}

				stops = _.filter(stops, function(stop) {
					return stop.lines.length > 0;
				});

				$rootScope.$broadcast('stopsLoaded', stops);
			}).catch(function(err) {
				console.log(err);
			});
		});
	});

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Services
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

gtfsApp.factory('AgencyService', function($http, $q, Globals) {
	var agencyService = {};

	agencyService.findMatchingAgencyByPosition = function(position) {
		var defer = $q.defer();

		if (!position) {
			defer.reject(new Error('Position is undefined'));
		}
		else {
			var url = Globals.baseURL + '/api/agencies/nearest?lat=' + position.coords.latitude + '&lon=' + position.coords.longitude;

			$http.get(url).success(function (agency, status, headers, config) {
				console.log("Nearest found Agency: " + JSON.stringify(agency, undefined, 2));
				defer.resolve(agency);
			}).error(function (data, status, headers, config) {
				defer.reject(new Error('HTTP error[' + status + ']'));
			});
		}

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

	stopService.fetchNearestStops = function(dataset, lat, lon, distance) {

		var defer = $q.defer();

		var url = Globals.baseURL + '/api/agencies/' + dataset + '/stops/' + Globals.date + '/nearest?lat=' + lat + '&lon=' + lon + '&distance=' + distance;

		$http.get(url).success(function (stops, status, headers, config) {
			defer.resolve(stops);
		}).error(function (data, status, headers, config) {
			defer.reject(new Error('HTTP error[' + status + ']'));
		});

		return defer.promise;
	};

	return stopService;
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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Position Marker
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

	legend += 'Lignes: <ul>' + _(stop.lines).uniq('name').map(function(line) {
		var background = line.route_color;
		var whiteBackground = !background || background == 'FFFFFF';
		var color = line.route_text_color;
		var name = line.name.substr(0, 3);
		var borderStyle = whiteBackground ? '1px solid #DDD' : '1px solid #' + background;
		return '<li class="sm-line" style="background: #' + background + '; color: #' + color + '; border: ' + borderStyle + '">' + name + '</span>';
	}).join('') + '</ul>';

	return legend;
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Controllers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

gtfsApp.controller('AppController', function($rootScope, $scope) {

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

gtfsApp.controller('SettingsController', function($scope) {

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

gtfsApp.controller('MainController', function($scope) {

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

gtfsApp.controller('StopsController', function($rootScope, $scope) {

	$scope.stops = [];

	$rootScope.$on('stopsReset', function(event) {
		$scope.stops = [];
	});

	$rootScope.$on('stopsLoaded', function(event, stops) {
		$scope.stops = _.sortBy($scope.stops.concat(stops), function(stop) {
			return stop.distance;
		});
	});

});

gtfsApp.controller('StopController', function($rootScope, $scope) {

	$scope.stopSelect = function() {
		console.log("Stop selected: " + $scope.stop.stop_id);
	};

});

gtfsApp.controller('StopLinesController', function() {

});

gtfsApp.controller('StopLineController', function($scope) {

	$scope.showContent = false;
	$scope.nextStopTime = Math.floor( moment($scope.line.stop_times[0].arrival_time, 'HH:mm:ss').diff(moment()) / 1000 / 60).toFixed(0);

	$scope.toggleContent = function() {
		$scope.showContent = !$scope.showContent;
	};

});

gtfsApp.controller('MapController', function($rootScope, $scope, $q, Globals) {

	$scope.stops = [];


	////////////////////////////////////////////////////////////////////////////////////////////////////////
	/// Map Init
	////////////////////////////////////////////////////////////////////////////////////////////////////////

	var agencyCenter = Globals.DEFAULT_POSITION;

	var lastInitialPosition = localStorage.getItem("lastInitialPosition");
	if (lastInitialPosition) {
		try {
			agencyCenter = JSON.parse(lastInitialPosition);
		} catch(err) {
			console.log("Error: " + err.message);
		}
	}

	var mapCenter = Globals.qsPosition ? Globals.qsPosition.coords : agencyCenter;
	var map = new google.maps.Map(document.getElementById('map-canvas'), { zoom: 17, center: { lat: mapCenter.latitude, lng: mapCenter.longitude } });


	$rootScope.$on('redrawMapEvent', function(event) {
		google.maps.event.trigger(map,'resize');
	});

	$rootScope.$on('stopsReset', function(event) {
		$scope.stops = [];
	});

	$rootScope.$on('stopsLoaded', function(event, stops) {

		$scope.stops = $scope.stops.concat(stops);


		////////////////////////////////////////////////////////////////////////////////////////////////////////
		/// Stops Markers
		////////////////////////////////////////////////////////////////////////////////////////////////////////

		for (var stop of stops) {
			new google.maps.StopMarker($scope, map, stop);
		}
	});

	$rootScope.$on('position', function(event, position) {

		localStorage.setItem("lastInitialPosition", JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }));

		map.panTo({lat: position.coords.latitude, lng: position.coords.longitude});


		////////////////////////////////////////////////////////////////////////////////////////////////////////
		/// Position Marker
		////////////////////////////////////////////////////////////////////////////////////////////////////////

		var positionMarker = new google.maps.PositionMarker($scope, map, {
			lat: position.coords.latitude,
			lng: position.coords.longitude
		});

		positionMarker.show();
	});

	$scope.initialize = function() {
		if (Globals.qsPosition) {
			Globals.setPosition(Globals.qsPosition);
		}
		else if (Modernizr.geolocation) {
			var geoLocationOptions = { enableHighAccuracy: false, maximumAge: 75000 };
			navigator.geolocation.getCurrentPosition($scope.onGeoLocationSuccess, $scope.onGeoLocationError, geoLocationOptions);
		}
		else {
			Globals.setPosition(undefined);
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

	google.maps.event.addDomListener(window, 'load', $scope.initialize);

});
