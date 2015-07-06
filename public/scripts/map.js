
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var commuteApp = angular.module('commuteApp');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Run
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.run(function($rootScope, Globals, AgencyService, StopService) {

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

		_(agencies).pluck('key').uniq().forEach(function (agencyKey) {
			StopService.fetchNearestStops(agencyKey, position.coords.latitude, position.coords.longitude, Globals.distance).then(function(stops) {

				var now = moment();

				stops.forEach(function(stop) {
					stop.routes.forEach(function(route) {
						if (!route.name) {
							route.name = 'N/A';
						}

						route.name = route.name.substr(0, 3);

						route.stop_times = _.chain(route.stop_times)
						.filter(function(stopTime) {
							return moment(stopTime, 'HH:mm').isAfter(now);
						})
						.sortBy(function(stopTime) {
							return stopTime;
						})
						.map(function(stopTime) {
							stopTime = stopTime.indexOf('24') == 0 ? '00' + stopTime.substr(2) : stopTime;

							return stopTime;
						})
						.value();

						route.stop_times = route.stop_times.slice(0, 10);
					});

					stop.routes = _.filter(stop.routes, function(route) {
						return route.stop_times.length > 0;
					});
				});

				stops = _.filter(stops, function(stop) {
					return stop.routes.length > 0;
				});

				$rootScope.$broadcast('stopsLoaded', stops);
			}).catch(function(err) {
				console.log(err);
			});
		});
	});

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Controllers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.controller('MapLayoutCtrl', function($rootScope, $scope) {

	$scope.showLeftSidebar = false;
	$scope.showRightSidebar = true;

	$scope.viewPrimaryActions = [{
		icon: 'ion-calendar',
		selected: true,
		onClick: $scope.toggleLeftSidebar
	}, {
		icon: 'ion-grid',
		selected: true,
		onClick: $scope.toggleRightSidebar
	}];

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

	$rootScope.$on('toggleLeftSidebar', function() {
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
	});

	$rootScope.$on('toggleRightSidebar', function() {
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
	});

});

commuteApp.controller('MapSidebarCalendarCtrl', function($scope, CalendarService) {
	$scope.days = [];

	CalendarService.buildCalendar().then(function(days) {
		$scope.days = days;
	});
});

commuteApp.controller('StopsCtrl', function($rootScope, $scope) {

	$scope.stops = [];
	$scope.searchFilter = '';
	$scope.allStops = [];

	$rootScope.$on('stopsReset', function(event) {
		$scope.stops = [];
	});

	$rootScope.$on('stopsLoaded', function(event, stops) {
		$scope.allStops = _.sortBy($scope.stops.concat(stops), function(stop) {
			return stop.distance;
		});

		$scope.filterStops();
	});

	$scope.onSearchFilterChange = function() {
		$scope.filterStops();
	}

	$scope.filterStops = function() {
		if (!$scope.searchFilter) {
			$scope.stops = $scope.allStops;
		} else {
			var searchFilter = $scope.searchFilter.toUpperCase();
			$scope.stops = _.filter($scope.allStops, function(stop) {
				return stop.name.indexOf(searchFilter) >= 0;
			});
		}
	}

});

commuteApp.controller('StopCtrl', function($rootScope, $scope) {
	
	$scope.stopSelect = function() {
		console.log("Stop selected: " + $scope.stop.stop_id);
	};

});

commuteApp.controller('StopLinesCtrl', function() {

});

commuteApp.controller('StopLineCtrl', function($scope) {

	$scope.showContent = false;
	var nextStopTime = moment($scope.route.stop_times[0], 'HH:mm');
	var now = moment();
	$scope.nextStopTime = Math.floor( nextStopTime.diff(now) / 1000 / 60 + (nextStopTime.isAfter(now) ? 0 : 24 * 60)).toFixed(0);

	$scope.toggleContent = function() {
		$scope.showContent = !$scope.showContent;
	};

});

commuteApp.controller('MapCtrl', function($rootScope, $scope, $q, Globals) {

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

		stops.forEach(function(stop) {
			new google.maps.StopMarker($scope, map, stop);
		});
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
