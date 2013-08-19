'use strict';

var emApp = angular.module('em.app', ['em.controllers', 'em.directives', 'em.filters', 'em.services']);

var emControllers = angular.module('em.controllers', []);
var emDirectives = angular.module('em.directives', []);
var emFilters = angular.module('em.filters', []);
var emServices = angular.module('em.services', ['em.base64']);

emApp.config(['$locationProvider', '$routeProvider',
function($locationProvider, $routeProvider) {

  $routeProvider.when('/my', {
    templateUrl : '/static/partials/my.html',
    controller : 'MyController',
    resolve : {
      userItems : ['userItems',
      function(userItems) {
        userItems.getItems();
      }]

    }
  });
  $routeProvider.when('/login', {
    templateUrl : '/static/partials/login.html',
    controller : 'LoginController'
  });
  $routeProvider.when('/notes', {
    templateUrl : '/static/partials/notes.html',
    controller : 'NotesController',
    resolve : {
      userItems : ['userItems',
      function(userItems) {
        userItems.getItems();
      }]

    }
  });
  $routeProvider.when('/tasks', {
    templateUrl : '/static/partials/tasks.html',
    controller : 'TasksController',
    resolve : {
      userItems : ['userItems',
      function(userItems) {
        userItems.getItems();
      }]

    }
  });
  $routeProvider.when('/', {
    templateUrl : '/static/partials/home.html',
    controller : 'HomeController'
  });
  $routeProvider.when('/404', {
    templateUrl : '/static/partials/pageNotFound.html',
    controller : 'PageNotFoundController'
  });
  $routeProvider.otherwise({
    redirectTo : '/404'
  });

  $locationProvider.html5Mode(true);
}]);

emApp.run(['$location', '$rootScope', 'UserAuthenticate',
function($location, $rootScope, UserAuthenticate) {
  $rootScope.$on('event:authenticationRequired', function() {
    UserAuthenticate.userAuthenticate();
  });
  $rootScope.$on('event:loginRequired', function() {
    $location.path('/login');
  });
  $rootScope.$on('event:loginSuccess', function() {
    $location.path('/my');
  });
}]);
