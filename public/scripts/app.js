////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var commuteApp = angular.module('commuteApp');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.factory('Globals', function($rootScope) {

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

	if (urlParams.date) {
		globals.date = urlParams.date;
	}

	globals.selectAgencies = function(agencies) {
		globals.agencies = agencies;

		if (!globals.position && globals.agencies && globals.agencies.length > 0) {
			globals.position = {
				coord: {
					latitude: (global.agencies[0].min_lat + global.agencies[0].max_lat) / 2,
					longitude: (global.agencies[0].min_lon + global.agencies[0].max_lon) / 2
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Controllers
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.controller('AppCtrl', function($rootScope, $scope, $state, UsersApiService) {

	$scope.logout = function() {
		console.log("Clicked on logout!");
		UsersApiService.logout().then(function() {
			location.href = '/?#/login';
		}).catch(function(err) {
			console.log("Failed to logout ! - Err: " + JSON.stringify(err));
		});
	};

});

commuteApp.controller('HeaderCtrl', function($scope, $state, Globals) {

	$scope.date = moment(Globals.date, "YYYY-MM-DD").format("DD/MM/YYYY");


	$scope.showCards = function() {
		console.log('Goto cards');
		$state.go('cards');
	};


});

commuteApp.controller('SettingsCtrl', function($scope, $rootScope) {

	$scope.showLeftSidebar = false;
	$scope.showRightSidebar = true;

	$scope.toggleLeftSidebar = function() {
		$scope.showLeftSidebar = !$scope.showLeftSidebar;

		$rootScope.$broadcast('toggleLeftSidebar');

		var btnCalendar = angular.element('#btn-calendar');

		if ($scope.showLeftSidebar) {
			btnCalendar.addClass('selected')
		} else {
			btnCalendar.removeClass('selected')
		}
	};

	$scope.toggleRightSidebar = function() {
		$scope.showRightSidebar = !$scope.showRightSidebar;

		$rootScope.$broadcast('toggleRightSidebar');

		var btnStops = angular.element('#btn-stops');

		if ($scope.showRightSidebar) {
			btnStops.addClass('selected')
		} else {
			btnStops.removeClass('selected')
		}
	};
});
