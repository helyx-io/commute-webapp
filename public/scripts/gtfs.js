////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var commuteApp = angular.module('commuteApp');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Services
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.factory('AgencyService', function($http, $q, Globals) {
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

commuteApp.factory('StopService', function($http, $q, Globals) {
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
