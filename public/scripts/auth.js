////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Application
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var commuteApp = angular.module('commuteApp');


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Config
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.config(function ($httpProvider) {

	$httpProvider.interceptors.push(function ($timeout, $q, $injector) {
		var $state;

		// this trick must be done so that we don't receive
		// `Uncaught Error: [$injector:cdep] Circular dependency found`
		$timeout(function () {
			$state = $injector.get('$state');
		});

		return {
			responseError: function (rejection) {
				return $q.reject(rejection);
			}
		};
	});

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Services
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.factory('UsersApiService', function ($rootScope, $q, $http, Globals) {
	var UsersApiService = {};

	UsersApiService.me = function (me) {
		return $http.get(Globals.baseURL + '/api/users/me');
	};

	UsersApiService.get = function (id) {
		return $http.get(Globals.baseURL + '/api/users/' + id);
	};

	UsersApiService.login = function (username, password) {
		return $http.post(Globals.baseURL + '/api/auth/login', { username: username, password: password });
	};

	UsersApiService.logout = function () {
		return $http.get(Globals.baseURL + '/api/auth/logout');
	};

	UsersApiService.signUp = function (firstname, lastname, username) {
		return $http.post(Globals.baseURL + '/api/auth/sign-up', {
			firstname: firstname,
			lastname: lastname,
			username: username
		});
	};

	UsersApiService.resetPassword = function (username) {
		return $http.post(Globals.baseURL + '/api/auth/password/reset', {
			username: username
		});
	};

	UsersApiService.changePassword = function (token, password) {
		return $http.post(Globals.baseURL + '/api/auth/password/change', {
			token: token,
			password: password
		});
	};

	return UsersApiService;
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///// Controllers
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

commuteApp.controller('LoginCtrl', function ($rootScope, $scope, $state, ngDialog, UsersApiService) {

	$scope.username = '';
	$scope.password = '';

	$scope.signUpKeyPressedHandlerSetup = false;

	// Called to navigate to the activities view
	$scope.login = function () {
		UsersApiService.login($scope.username, $scope.password).then(function(user) {
			$rootScope.currentUser = user;
			location.href = '/#/tab.activities';
		}).catch(function(err) {
			alert("Failed to authenticate. Username and / or password mismatched. - Err: " + (err.message || JSON.stringify(err)));
		});
	};

	$scope.signUp = function () {
		$scope.modalTitle = "Sign Up";
		ngDialog.open({ template: 'views/sign-up.html' });
	};

	$scope.resetPassword = function () {
		$scope.modalTitle = "Reset password";
		ngDialog.open({ template: 'views/reset-password.html' });
	};

});


commuteApp.controller('SignUpCtrl', function ($scope, $state, UsersApiService) {

	$scope.firstname = '';
	$scope.lastname = '';
	$scope.username = '';

	$scope.signUp = function () {

		UsersApiService.signUp($scope.firstname, $scope.lastname, $scope.username).then(function() {
			$scope.closeThisDialog();
		}).catch(function(err) {
			alert("Failed to sign-up - Err: " + (err.message || JSON.stringify(err)));
		});
	};

});


commuteApp.controller('ResetPasswordCtrl', function ($scope, $state, UsersApiService) {

	$scope.username = '';

	$scope.resetPassword = function () {

		UsersApiService.resetPassword($scope.username).then(function() {
			location.href = '/#login';
		}).catch(function(err) {
			alert("Failed to ask for password reset - Err: " + (err.message || JSON.stringify(err)));
		});
	};

});


commuteApp.controller('ChangePasswordCtrl', function ($scope, $state, $stateParams, UsersApiService) {

	$scope.token = $stateParams.token;
	$scope.newPassword = '';
	$scope.confirmNewPassword = '';

	$scope.changePassword = function () {

		UsersApiService.changePassword($scope.token, $scope.newPassword).then(function() {
			location.href = '/#login';
		}).catch(function(err) {
			alert("Failed to ask for password reset - Err: " + (err.message || JSON.stringify(err)));
		});
	};

});


commuteApp.controller('LogoutCtrl', function ($scope) {

});
