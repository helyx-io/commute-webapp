////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var commuteApp = angular.module('commuteApp');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Controllers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.config(function() {


});

commuteApp.controller('CardsCtrl', function($rootScope, $scope) {

	$scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
		console.log("State Change: State change success!");
		Grid.init({ rows: 3, columns: 3, maxrows: 3, maxcolumns: 3 });
	});

});