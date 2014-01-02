/*jslint white: true */
'use strict';

function ContextController($location, $scope, $routeParams, ErrorHandlerService, tagsArray, tasksArray, OwnerService) {

  $scope.errorHandler = ErrorHandlerService;
  $scope.prefix = OwnerService.getPrefix();

  if ($routeParams.uuid) {
    $scope.context = tagsArray.getTagByUUID($routeParams.uuid);
    $scope.tasks = tasksArray.getSubtasksByTagUUID($scope.context.uuid);
  }
}

ContextController.$inject = ['$location', '$scope', '$routeParams', 'ErrorHandlerService', 'tagsArray', 'tasksArray', 'OwnerService'];
angular.module('em.app').controller('ContextController', ContextController);
