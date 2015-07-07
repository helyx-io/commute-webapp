////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var commuteApp = angular.module('commuteApp');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Services
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.factory('ActivitiesApiService', function ($modal, $rootScope, $q, $http, Globals) {
	var ActivitiesApiService = {};

	ActivitiesApiService.recents = function () {
		return $http.get(Globals.baseURL + '/api/activities');
	};

	return ActivitiesApiService;
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Controllers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.controller('ActivitiesCtrl', function ($rootScope, $scope, ActivitiesApiService) {

	$scope.activities = [];

	ActivitiesApiService.recents().then(function (activities) {
		$scope.activities = activities.data;
	}).catch(function (err) {
		console.log(err);
	});

});