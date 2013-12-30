/*global angular */
'use strict';

function ProjectController($location, $scope, $routeParams, date, errorHandler, filterService, itemsArray, tagsArray, tasksArray, tasksRequest, tasksResponse, userPrefix) {
  $scope.tasks = tasksArray.getTasks();
  $scope.tags = tagsArray.getTags();
  $scope.items = itemsArray.getItems();

  $scope.errorHandler = errorHandler;
  $scope.prefix = userPrefix.getPrefix();
  $scope.filterService = filterService;

  $scope.dates = date.week();
  $scope.date = date.today();

  $scope.editProject = function() {
    $location.path(userPrefix.getPrefix() + '/tasks/edit/' + $scope.project.uuid);
  };

  $scope.completeProject = function() {
    var i = 0;

    while ($scope.tasks[i]) {
      if (!$scope.tasks[i].completed) {
        if ($scope.tasks[i].relationships) {
          if ($scope.tasks[i].relationships.parentTask) {
            if ($scope.tasks[i].relationships.parentTask === $scope.project.uuid) {
              $scope.errorHandler.errorMessage = 'Cannot complete project. Project still has uncompleted subtasks.';
              return;
            }
          }
        }
      }
      i++;
    }

    tasksRequest.completeTask($scope.project).then(function(completeTaskResponse) {
      tasksResponse.putTaskContent($scope.project, completeTaskResponse);

      i = 0;

      while ($scope.tasks[i]) {
        if ($scope.tasks[i].relationships) {
          if ($scope.tasks[i].relationships.parentTask) {
            if ($scope.tasks[i].relationships.parentTask === $scope.project.uuid) {
              tasksArray.removeTask($scope.tasks[i]);
            }
          }
        }
        i++;
      }

      tasksArray.removeTask($scope.project);

      window.history.back();

    });
  };
}

ProjectController.$inject = ['$location', '$scope', '$routeParams', 'date', 'errorHandler', 'filterService', 'itemsArray', 'tagsArray', 'tasksArray', 'tasksRequest', 'tasksResponse', 'userPrefix'];
angular.module('em.app').controller('ProjectController', ProjectController);
