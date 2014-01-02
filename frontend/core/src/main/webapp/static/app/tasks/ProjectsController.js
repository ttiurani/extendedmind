/*global angular */
'use strict';

function ProjectsController($scope, date, ErrorHandlerService, FilterService, itemsArray, tagsArray, tasksArray, userPrefix) {
  $scope.tasks = tasksArray.getTasks();
  $scope.tags = tagsArray.getTags();
  $scope.items = itemsArray.getItems();

  $scope.filterService = FilterService;
  $scope.prefix = userPrefix.getPrefix();
  $scope.errorHandler = ErrorHandlerService;

  $scope.dates = date.week();
  $scope.date = date.today();
}

ProjectsController.$inject = ['$scope', 'date', 'ErrorHandlerService', 'FilterService', 'itemsArray', 'tagsArray', 'tasksArray', 'userPrefix'];
angular.module('em.app').controller('ProjectsController', ProjectsController);
