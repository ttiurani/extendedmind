/*jshint sub:true*/
'use strict';

function TasksController($location, $scope, $timeout, $routeParams, UserSessionService, OwnerService, TasksService, ListsService, TagsService, SwiperService, TasksSlidesService) {

  if (!$scope.task){
    if ($location.path().indexOf('/edit/' != -1) || $location.path().indexOf('/new' != -1)){
      if ($routeParams.uuid) {
        $scope.task = TasksService.getTaskByUUID($routeParams.uuid, UserSessionService.getActiveUUID());
        if ($scope.task.due) $scope.showDate = true;
      }else {
        $scope.task = {
          relationships: {
            tags: []
          }
        };
        if ($routeParams.parentUUID){
          $scope.task.relationships.list = $routeParams.parentUUID;
        }
      }
    }
  }

  $scope.focusDate = function() {
    $scope.showDate = true;
  };

  $scope.saveTask = function(task) {
    TasksService.saveTask(task, UserSessionService.getActiveUUID());
    window.history.back();
  };

  $scope.cancelEdit = function() {
    window.history.back();
  };

  $scope.addNew = function() {
    $location.path($scope.prefix + '/tasks/new');
  };

  $scope.dateClicked = function(dateString) {
    SwiperService.swipeTo(TasksSlidesService.getDateSlidePath(dateString));
  };

  $scope.editTaskTitle = function(task) {
    TasksService.saveTask(task, UserSessionService.getActiveUUID());
  };

  $scope.editTask = function(task) {
    $location.path(OwnerService.getPrefix() + '/tasks/edit/' + task.uuid);
  };

  $scope.taskChecked = function(task) {
    if (task.completed) {
      TasksService.uncompleteTask(task, UserSessionService.getActiveUUID());
    } else {
      TasksService.completeTask(task, UserSessionService.getActiveUUID());
    }
  };

  $scope.taskToList = function(task) {
    TasksService.taskToList(task, UserSessionService.getActiveUUID());
    $location.path(OwnerService.getPrefix() + '/tasks/new/' + task.uuid);
  };

  $scope.deleteTask = function(task) {
    TasksService.deleteTask(task, UserSessionService.getActiveUUID());
  };

  $scope.addSubtask = function(subtask) {
    var subtaskToSave = {title: subtask.title};
    if (subtask.due){
      subtaskToSave.due = subtask.due;
    }
    if (subtask.relationships){
      subtaskToSave.relationships = {};
      if(subtask.relationships.list){
        subtaskToSave.relationships.list = subtask.relationships.list;
      }
      if(subtask.relationships.context){
        subtaskToSave.relationships.context = subtask.relationships.context;
      }
    }
    delete subtask.title;

    TasksService.saveTask(subtaskToSave, UserSessionService.getActiveUUID()).then(function(/*subtaskToSave*/){
      // TODO: Something with task
    });
  };

  $scope.taskQuickEditDone = function(task) {
    TasksService.saveTask(task, UserSessionService.getActiveUUID());
    $scope.close(task);
  };

  $scope.getDoneButtonClass = function(task) {
    if (!(task.relationships && task.relationships.list)){
      return 'left-of-three';
    }else{
      return 'left-of-two';
    }
  };

  $scope.getSubtaskButtonClass = function(task) {
    if (!(task.relationships && task.relationships.list)){
      return 'center-of-three';
    }
  };

  $scope.getDeleteButtonClass = function(task) {
    if (!(task.relationships && task.relationships.list)){
      return 'right-of-three';
    }else{
      return 'right-of-two';
    }
  };

  // CONTEXTS

  $scope.goToContext = function(uuid) {
    SwiperService.swipeTo(TasksSlidesService.CONTEXTS + '/' + uuid);
  };

  $scope.addContext = function(newContext) {
    TagsService.saveTag(newContext, UserSessionService.getActiveUUID()).then(function(/*tag*/) {
      // Using timeout 0 to make sure that DOM is ready before refreshing swiper.
      $timeout(function() {
        SwiperService.refreshSwiper(TasksSlidesService.CONTEXTS);
      });
    });
    $scope.newContext = {title: undefined, tagType: 'context'};
  };
}

TasksController['$inject'] = ['$location', '$scope', '$timeout', '$routeParams', 'UserSessionService', 'OwnerService', 'TasksService', 'ListsService', 'TagsService', 'SwiperService', 'TasksSlidesService'];
angular.module('em.app').controller('TasksController', TasksController);
