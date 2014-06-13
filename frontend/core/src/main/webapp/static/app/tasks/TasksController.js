'use strict';

function TasksController($scope, DateService, SwiperService, UISessionService, TasksService, AnalyticsService) {

  $scope.initializeTask = function(task){
    if (task.due) $scope.showDateInput = true;
    else $scope.showDateInput = false;
  };

  $scope.focusDate = function() {
    $scope.showDateInput = true;
  };

  $scope.hideDate = function() {
    $scope.showDateInput = false;
  };

  $scope.repeatTypes = ['daily', 'weekly', 'monthly', 'yearly'];

  $scope.saveTask = function(task) {
    if (task.uuid) {
      AnalyticsService.do('saveTask', 'new');
    } else {
      AnalyticsService.do('saveTask', 'existing');
    }
    TasksService.saveTask(task, UISessionService.getActiveUUID()).then(gotoTask);

    function gotoTask(savedTask) {
      var mainSlidePath, pageSlidePath;

      // date
      if (savedTask.due) {
        mainSlidePath = 'tasks/home';
        DateService.constructActiveWeekByDate(new Date(savedTask.due));
        DateService.constructDatePickerWeeksByDate(new Date(savedTask.due));
        var weekDay = DateService.getWeekday(new Date(savedTask.due));
        pageSlidePath = mainSlidePath + '/' + weekDay;
      }
      // list
      else if (savedTask.relationships && savedTask.relationships.parent) {
        mainSlidePath = 'tasks/details';
        pageSlidePath = mainSlidePath + '/' + savedTask.relationships.parent;
      }
      // context
      else if (savedTask.relationships && savedTask.relationships.tags && savedTask.relationships.tags[0]) {
        mainSlidePath = 'tasks/details';
        pageSlidePath = mainSlidePath + '/' + savedTask.relationships.tags[0];
      }
      // unsorted
      else {
        mainSlidePath = 'tasks/details';
        pageSlidePath = mainSlidePath + '/unsorted';
      }

      if (!$scope.isFeatureActive('tasks')) {
        UISessionService.changeFeature('tasks', savedTask, mainSlidePath);
      }
      SwiperService.swipeToWithCallback(pageSlidePath);
    }
  };

  $scope.editTaskFields = function(task) {
    AnalyticsService.do('editTaskFields');
    TasksService.saveTask(task, UISessionService.getActiveUUID());
  };

  $scope.editTask = function(task) {
    $scope.editItemInOmnibar(task, 'task');
  };

  $scope.taskChecked = function(task) {
    if (task.completed) {
      AnalyticsService.do('uncompleteTask');
      TasksService.uncompleteTask(task, UISessionService.getActiveUUID());
    } else {
      AnalyticsService.do('completeTask');
      TasksService.completeTask(task, UISessionService.getActiveUUID());
    }
  };

  $scope.deleteTask = function(task) {
    AnalyticsService.do('deleteTask');
    TasksService.deleteTask(task, UISessionService.getActiveUUID());
  };

  $scope.addSubtask = function(subtask) {
    if (!subtask.title  || subtask.title.length === 0) return false;
    var subtaskToSave = {title: subtask.title};
    if (subtask.date) {
      subtaskToSave.date = subtask.date;
    }
    if (subtask.relationships) {
      subtaskToSave.relationships = {};
      if(subtask.relationships.list) {
        subtaskToSave.relationships.list = subtask.relationships.list;
      }
      if(subtask.relationships.context) {
        subtaskToSave.relationships.context = subtask.relationships.context;
      }
    }
    delete subtask.title;

    TasksService.saveTask(subtaskToSave, UISessionService.getActiveUUID()).then(function(/*subtaskToSave*/) {
      AnalyticsService.do('addTask');
    });
  };

  function setTaskDateAndSave(task, dateSetterFn) {
    var startingDate = DateService.getDateTodayOrFromLaterYYYYMMDD(task.date);
    task.date = dateSetterFn(startingDate).getYYYYMMDD(startingDate);
    $scope.taskQuickEditDone(task);
  }

  $scope.taskQuickEditDone = function(task) {
    AnalyticsService.do('taskQuickEditDone');
    TasksService.saveTask(task, UISessionService.getActiveUUID());
  };

  $scope.setDateToday = function setDateToday(task) {
    task.date = DateService.getTodayYYYYMMDD();
    $scope.taskQuickEditDone(task);
  };
  $scope.setDateTomorrow = function setDateTomorrow(task) {
    task.date = DateService.getTomorrowYYYYMMDD();
    $scope.taskQuickEditDone(task);
  };
  $scope.setDateNextDay = function setDateNextDay(task) {
    setTaskDateAndSave(task, DateService.setOffsetDate.bind(DateService, 1));
  };
  $scope.setDateTwoDaysLater = function setDateTwoDaysLater(task) {
    setTaskDateAndSave(task, DateService.setOffsetDate.bind(DateService, 2));
  };
  $scope.setDateWeekend = function setDateWeekend(task) {
    setTaskDateAndSave(task, DateService.setReferenceDate.bind(DateService, 'saturday'));
  };
  $scope.setDateFirstDayOfNextWeek = function setDateFirstDayOfNextWeek(task) {
    setTaskDateAndSave(task, DateService.setReferenceDate.bind(DateService, 'monday'));
  };
  $scope.setDateFirstDayOfNextMonth = function setDateFirstDayOfNextMonth(task) {
    setTaskDateAndSave(task, DateService.setDateToFirstDayOfNextMonth.bind(DateService));
  };

  $scope.isTaskDateTodayOrLess = function isTaskDateTodayOrLess(task) {
    if (!task.date) return; // set date/snooze ng-swith-default value
    return task.date <= DateService.getTodayYYYYMMDD();
  };

  $scope.taskHasDate = function taskHasDate(task) {
    return task.date;
  };

  // Navigation

  $scope.context = undefined;
  $scope.showContextDetails = function(selectedContext) {
    $scope.context = selectedContext;
    $scope.subtask = {relationships: {context: $scope.context.uuid}};
    SwiperService.swipeTo('tasks/details');
  };
  $scope.showNoContextDetails = function() {
    $scope.context = undefined;
    $scope.subtask = {};
    SwiperService.swipeTo('tasks/details');
  };

  $scope.deleteContextAndShowContexts = function(context) {
    SwiperService.swipeTo('tasks/contexts');
    $scope.deleteContext(context);
    $scope.context = undefined;
  };
}

TasksController['$inject'] = ['$scope', 'DateService', 'SwiperService', 'UISessionService', 'TasksService', 'AnalyticsService'];
angular.module('em.app').controller('TasksController', TasksController);
