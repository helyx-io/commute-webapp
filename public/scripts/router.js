////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var commuteApp = angular.module('commuteApp');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Run
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.run(function($rootScope, UsersApiService) {

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/// Root scope event listeners
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	$rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

		console.log("toState: " + JSON.stringify(toState));

		$rootScope.viewPrimaryActions = toState.$scope ? toState.$scope.viewPrimaryActions : [];

		if (!$rootScope.currentUser && ( !toState.data || toState.data.requireLogin === undefined || toState.data.requireLogin ) ) {
			UsersApiService.me().then(function (me) {
				console.log("User is authenticated - me: " + JSON.stringify(me));
			}).catch(function (err) {
				console.log("User is not authenticated - Err: " + JSON.stringify(err));
				location.href = '/#/login';
			});
		}

	});

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Config
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.config(function ($stateProvider, $urlRouterProvider) {

	$stateProvider
		.state('map', {
			url: '/map',
			templateUrl: 'views/map.html',
			controller: 'AppCtrl',
			data: {
				requireLogin: true
			}
		})

		.state('cards', {
			url: '/cards',
			templateUrl: 'views/cards.html',
			controller: 'CardsCtrl',
			data: {
				requireLogin: true
			}
		})

		.state('login', {
			url: '/login',
			templateUrl: 'views/login.html',
			controller: 'LoginCtrl',
			data: {
				requireLogin: false
			}
		})

		.state('logout', {
			url: '/logout',
			templateUrl: 'views/logout.html',
			controller: 'LogoutCtrl',
			data: {
				requireLogin: false
			}
		})

		.state('change-password', {
			url: '/password/change?token',
			templateUrl: 'views/change-password.html',
			controller: 'ChangePasswordCtrl',
			data: {
				requireLogin: false
			}
		})

		// if none of the above states are matched, use this as the fallback
		.state("otherwise", {
			url: "*path",
			template: "",
			controller: [
				'$timeout','$state',
				function($timeout,  $state ) {
					$timeout(function() {
						$state.go('map');
					},0)
				}]
		});
});

commuteApp.config(function ($sceDelegateProvider) {

	// whitelist urls
	$sceDelegateProvider.resourceUrlWhitelist([
		// Allow same origin resource loads.
		'self',
		'http://localhost:9000/**',
		'http://commute.sh/**',
		'https://commute.sh/**'
	]);

});
