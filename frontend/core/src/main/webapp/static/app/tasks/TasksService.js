/* Copyright 2013-2014 Extended Mind Technologies Oy
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /*global angular */
 'use strict';

 function TasksService($q, $rootScope,
                       ArrayService, BackendClientService, ExtendedItemService,
                       ListsService, TagsService, UISessionService, UserSessionService, UUIDService) {
  var tasks = {};

  var taskRegex = /\/task/;
  var taskSlashRegex = /\/task\//;
  var completeRegex = /\/complete/;
  var uncompleteRegex = /\/uncomplete/;

  function initializeArrays(ownerUUID) {
    if (!tasks[ownerUUID]) {
      tasks[ownerUUID] = {
        activeTasks: [],
        deletedTasks: [],
        archivedTasks: []
      };
    }
  }

  function getOtherArrays(ownerUUID) {
    return [{array: tasks[ownerUUID].archivedTasks, id: 'archived'}];
  }

  function updateTask(task, ownerUUID) {
    if (task) addTransientProperties([task], ownerUUID);
    return ArrayService.updateItem(task,
                                   tasks[ownerUUID].activeTasks,
                                   tasks[ownerUUID].deletedTasks,
                                   getOtherArrays(ownerUUID));
  }

  function setTask(task, ownerUUID) {
    initializeArrays(ownerUUID);
    ArrayService.setItem(task,
                         tasks[ownerUUID].activeTasks,
                         tasks[ownerUUID].deletedTasks,
                         getOtherArrays(ownerUUID));
  }

  // Setup callback to ListsService
  var itemArchiveCallback = function(children, archived, ownerUUID) {
    if (tasks[ownerUUID] && children) {
      for (var i=0, len=children.length; i<len; i++) {
        var activeTask = tasks[ownerUUID].activeTasks.findFirstObjectByKeyValue('uuid', children[i].uuid);
        if (activeTask) {
          activeTask.archived = archived;
          activeTask.modified = children[i].modified;
          updateTask(activeTask, ownerUUID);
        } else {
          var deletedTask = tasks[ownerUUID].deletedTasks.findFirstObjectByKeyValue('uuid', children[i].uuid);
          if (deletedTask) {
            deletedTask.archived = archived;
            deletedTask.modified = children[i].modified;
            updateTask(deletedTask, ownerUUID);
          } else {
            var archivedTask = tasks[ownerUUID].archivedTasks.findFirstObjectByKeyValue('uuid',
                                                                                        children[i].uuid);
            if (archivedTask) {
              archivedTask.archived = archived;
              archivedTask.modified = children[i].modified;
              updateTask(archivedTask, ownerUUID);
            }
          }
        }
      }
    }
  };
  ListsService.registerItemArchiveCallback(itemArchiveCallback, 'TasksService');

  // Setup callback for tags
  var tagDeletedCallback = function(deletedTag, ownerUUID) {
    if (tasks[ownerUUID] && deletedTag) {
      // Remove tags from existing parents
      TagsService.removeDeletedTagFromItems(tasks[ownerUUID].activeTasks, deletedTag);
      TagsService.removeDeletedTagFromItems(tasks[ownerUUID].deletedTasks, deletedTag);
      TagsService.removeDeletedTagFromItems(tasks[ownerUUID].archivedTasks, deletedTag);
    }
  };
  TagsService.registerTagDeletedCallback(tagDeletedCallback, 'TasksService');

  // Setup callback for lists
  var listDeletedCallback = function(deletedList, ownerUUID) {
    if (tasks[ownerUUID] && deletedList) {
      // Remove list from existing parents
      ListsService.removeDeletedListFromItems(tasks[ownerUUID].activeTasks, deletedList);
      ListsService.removeDeletedListFromItems(tasks[ownerUUID].deletedTasks, deletedList);
      ListsService.removeDeletedListFromItems(tasks[ownerUUID].archivedTasks, deletedList);
    }
  };
  ListsService.registerListDeletedCallback(listDeletedCallback, 'TasksService');

  // due is persistent, date is transient
  function copyDueToDate(task) {
    if (task.due) {
      if (!task.trans) task.trans = {};
      task.trans.date = task.due;
    }
  }
  // copies completed field from persistent to transient
  function copyCompleted(task) {
    if (task.completed){
      if (!task.trans) task.trans = {};
      task.trans.completed = task.completed !== undefined;
    }
  }
  // date is transient, due is persistent
  function copyDateToDue(task) {
    if (task.trans && task.trans.date) task.due = task.trans.date;

    // date has been removed from task, delete persistent value
    else if (task.due) delete task.due;

    // AngularJS sets date property to 'null' if it is used in ng-model data-binding and no value is set.
    // http://stackoverflow.com/a/7445368
    if (task.trans)
      if (!Date.parse(task.trans.date)) delete task.trans.date;
  }

  function copyDescriptionToTransientProperties(task) {
    if (task.description) {
      if (!task.trans) task.trans = {};
      task.trans.description = task.description;
    }
  }
  function copyTransientDescriptionToPersistent(task) {
    if (task.trans && task.trans.description)
      task.description = task.trans.description;
    else if (task.description) delete task.description;

    // AngularJS sets property to empty string '""' if it is used in ng-model data-binding and text is
    // removed.
    if (task.trans && task.trans.description === '')
      delete task.trans.description;
  }

  function addTransientProperties(tasksArray, ownerUUID, addExtraTransientPropertyFn) {
    var addExtraTransientPropertyFunctions = [copyDueToDate, copyCompleted,
      copyDescriptionToTransientProperties];
    if (typeof addExtraTransientPropertyFn === 'function')
      addExtraTransientPropertyFunctions.push(addExtraTransientPropertyFn);
    ExtendedItemService.addTransientProperties(tasksArray, ownerUUID, 'task',
                                               addExtraTransientPropertyFunctions);
  }

  return {
    setTasks: function(tasksResponse, ownerUUID) {
      initializeArrays(ownerUUID);
      this.addTransientProperties(tasksResponse, ownerUUID);

      return ArrayService.setArrays(tasksResponse,
                                    tasks[ownerUUID].activeTasks,
                                    tasks[ownerUUID].deletedTasks,
                                    getOtherArrays(ownerUUID));
    },
    updateTasks: function(tasksResponse, ownerUUID) {
      initializeArrays(ownerUUID);
      this.addTransientProperties(tasksResponse, ownerUUID);
      return ArrayService.updateArrays(tasksResponse,
                                       tasks[ownerUUID].activeTasks,
                                       tasks[ownerUUID].deletedTasks,
                                       getOtherArrays(ownerUUID));
    },
    updateTaskProperties: function(uuid, properties, ownerUUID) {
      var updatedTask = ArrayService.updateItemProperties(uuid,
                                                          properties,
                                                          tasks[ownerUUID].activeTasks,
                                                          tasks[ownerUUID].deletedTasks,
                                                          getOtherArrays(ownerUUID));
      if (updatedTask) this.addTransientProperties([updatedTask], ownerUUID);
      return updatedTask;
    },
    getTasks: function(ownerUUID) {
      initializeArrays(ownerUUID);
      return tasks[ownerUUID].activeTasks;
    },
    getArchivedTasks: function(ownerUUID) {
      initializeArrays(ownerUUID);
      return tasks[ownerUUID].archivedTasks;
    },
    getDeletedTasks: function(ownerUUID) {
      initializeArrays(ownerUUID);
      return tasks[ownerUUID].deletedTasks;
    },
    getTaskInfo: function(uuid, ownerUUID) {
      initializeArrays(ownerUUID);
      var task = tasks[ownerUUID].activeTasks.findFirstObjectByKeyValue('uuid', uuid);
      if (task){
        return {
          type: 'active',
          task: task
        };
      }
      task = tasks[ownerUUID].deletedTasks.findFirstObjectByKeyValue('uuid', uuid);
      if (task){
        return {
          type: 'deleted',
          task: task
        };
      }
      task = tasks[ownerUUID].archivedTasks.findFirstObjectByKeyValue('uuid', uuid);
      if (task){
        return {
          type: 'archived',
          task: task
        };
      }
    },
    saveTask: function(task, ownerUUID) {
      initializeArrays(ownerUUID);
      var deferred = $q.defer();
      if (this.getTaskStatus(task, ownerUUID) === 'deleted') deferred.reject(task);
      else {
        var transientProperties = this.detachTransientProperties(task, ownerUUID);
        if (task.uuid) {
          // Existing task
          if (UserSessionService.isOfflineEnabled()) {
            // Push to offline buffer
            params = {type: 'task', owner: ownerUUID, uuid: task.uuid};
            BackendClientService.put('/api/' + params.owner + '/task/' + task.uuid,
                                     this.putExistingTaskRegex, params, task);
            task.modified = BackendClientService.generateFakeTimestamp();
            ExtendedItemService.attachTransientProperties(task, transientProperties, 'task');
            updateTask(task, ownerUUID);
            deferred.resolve(task);
          } else {
            // Online
            BackendClientService.putOnline('/api/' + ownerUUID + '/task/' + task.uuid,
                                           this.putExistingTaskRegex, task).
            then(function(result) {
              if (result.data) {
                task.modified = result.data.modified;
                ExtendedItemService.attachTransientProperties(task, transientProperties, 'task');
                updateTask(task, ownerUUID);
                deferred.resolve(task);
              }
            });
          }
        } else {
          // New task
          if (UserSessionService.isOfflineEnabled()) {
            // Push to offline queue with fake UUID
            var fakeUUID = UUIDService.generateFakeUUID();
            var params = {type: 'task', owner: ownerUUID, fakeUUID: fakeUUID};
            BackendClientService.put('/api/' + params.owner + '/task',
                                     this.putNewTaskRegex, params, task);
            task.uuid = fakeUUID;
            // Use a fake modified that is far enough in the to make
            // it to the end of the list
            task.created = task.modified = BackendClientService.generateFakeTimestamp();
            ExtendedItemService.attachTransientProperties(task, transientProperties, 'task');
            setTask(task, ownerUUID);
            deferred.resolve(task);
          } else {
            // Online
            BackendClientService.putOnline('/api/' + ownerUUID + '/task',
                                           this.putNewTaskRegex, task).
            then(function(result) {
              if (result.data) {
                task.uuid = result.data.uuid;
                task.created = result.data.created;
                task.modified = result.data.modified;
                ExtendedItemService.attachTransientProperties(task, transientProperties, 'task');
                setTask(task, ownerUUID);
                deferred.resolve(task);
              }
            });
          }
        }
      }
      return deferred.promise;
    },
    getTaskStatus: function(task, ownerUUID) {
      initializeArrays(ownerUUID);
      var arrayInfo = ArrayService.getActiveArrayInfo(task,
                                                      tasks[ownerUUID].activeTasks,
                                                      tasks[ownerUUID].deletedTasks,
                                                      getOtherArrays(ownerUUID));

      if (arrayInfo) return arrayInfo.type;
    },
    addTask: function(task, ownerUUID) {
      initializeArrays(ownerUUID);
      // Check that task is not deleted before trying to add
      if (this.getTaskStatus(task, ownerUUID) === 'deleted') return;
      setTask(task, ownerUUID);
    },
    removeTask: function(task, ownerUUID) {
      initializeArrays(ownerUUID);
      ArrayService.removeFromArrays(task,
                                    tasks[ownerUUID].activeTasks,
                                    tasks[ownerUUID].deletedTasks,
                                    getOtherArrays(ownerUUID));
    },
    deleteTask: function(task, ownerUUID) {
      initializeArrays(ownerUUID);
      // Check if task has already been deleted
      if (this.getTaskStatus(task, ownerUUID) === 'deleted') return;

      if (UserSessionService.isOfflineEnabled()) {
        // Offline
        var params = {type: 'task', owner: ownerUUID, uuid: task.uuid,
        reverse: {
          method: 'post',
          url: '/api/' + ownerUUID + '/task/' + task.uuid + '/undelete'
        }, replaceable: true};
        BackendClientService.deleteOffline('/api/' + ownerUUID + '/task/' + task.uuid,
                                           this.deleteTaskRegex, params);
        task.deleted = task.modified = BackendClientService.generateFakeTimestamp();
        updateTask(task, ownerUUID);
      } else {
        // Online
        BackendClientService.deleteOnline('/api/' + ownerUUID + '/task/' + task.uuid,
                                          this.deleteTaskRegex)
        .then(function(result) {
          if (result.data) {
            task.deleted = result.data.deleted;
            task.modified = result.data.result.modified;
            updateTask(task, ownerUUID);
          }
        });
      }
    },
    undeleteTask: function(task, ownerUUID) {
      initializeArrays(ownerUUID);
      // Check that task is deleted before trying to undelete
      if (this.getTaskStatus(task, ownerUUID) !== 'deleted') return;

      if (UserSessionService.isOfflineEnabled()) {
        // Offline
        var params ={type: 'task', owner: ownerUUID, uuid: task.uuid,
        reverse: {
          method: 'post',
          url: '/api/' + ownerUUID + '/task/' + task.uuid + '/delete'
        },
        replaceable: true};
        BackendClientService.post('/api/' + ownerUUID + '/task/' + task.uuid + '/undelete',
                                  this.undeleteTaskRegex, params);
        delete task.deleted;
        updateTask(task, ownerUUID);
      } else {
        // Online
        BackendClientService.postOnline('/api/' + ownerUUID + '/task/' + task.uuid + '/undelete',
                                        this.undeleteTaskRegex)
        .then(function(result) {
          if (result.data) {
            delete task.deleted;
            task.modified = result.data.modified;
            updateTask(task, ownerUUID);
          }
        });
      }
    },
    completeTask: function(task, ownerUUID) {
      initializeArrays(ownerUUID);
      var deferred = $q.defer();
      // Check that task is not deleted before trying to complete
      if (this.getTaskStatus(task, ownerUUID) === 'deleted') return;

      if (UserSessionService.isOfflineEnabled()) {
        // Offline
        var params = {type: 'task', owner: ownerUUID, uuid: task.uuid,
        reverse: {
          method: 'post',
          url: '/api/' + ownerUUID + '/task/' + task.uuid + '/uncomplete'
        }, replaceable: true};
        BackendClientService.post('/api/' + ownerUUID + '/task/' + task.uuid + '/complete',
                                  this.completeTaskRegex, params);
        task.completed = task.modified = BackendClientService.generateFakeTimestamp();
        updateTask(task, ownerUUID);
        deferred.resolve(task);
      } else {
        // Online
        BackendClientService.postOnline('/api/' + ownerUUID + '/task/' + task.uuid + '/complete',
                                        this.completeTaskRegex)
        .then(function(result) {
          if (result.data) {
            task.completed = result.data.completed;
            task.modified = result.data.modified;
          }
          updateTask(task, ownerUUID);
          deferred.resolve(task);
        });
      }
      return deferred.promise;
    },
    uncompleteTask: function(task, ownerUUID) {
      initializeArrays(ownerUUID);
      var deferred = $q.defer();
      // Check that task is not deleted before trying to uncomplete
      if (this.getTaskStatus(task, ownerUUID) === 'deleted') return;

      if (UserSessionService.isOfflineEnabled()) {
        var params = {type: 'task', owner: ownerUUID, uuid: task.uuid,
        reverse: {
          method: 'post',
          url: '/api/' + ownerUUID + '/task/' + task.uuid + '/complete'
        },
        replaceable: true};
        // Offline
        BackendClientService.post('/api/' + ownerUUID + '/task/' + task.uuid + '/uncomplete',
                                  this.uncompleteTaskRegex, params);
        delete task.completed;
        task.modified = BackendClientService.generateFakeTimestamp();
        updateTask(task, ownerUUID);
        deferred.resolve(task);
      } else {
        // Online
        BackendClientService.postOnline('/api/' + ownerUUID + '/task/' + task.uuid + '/uncomplete',
                                        this.uncompleteTaskRegex)
        .then(function(result) {
          if (result.data) {
            delete task.completed;
            task.modified = result.data.modified;
            updateTask(task, ownerUUID);
          }
          deferred.resolve(task);
        });
      }
      return deferred.promise;
    },
    addTransientProperties: function(tasksArray, ownerUUID, addExtraTransientPropertyFn) {
      addTransientProperties(tasksArray, ownerUUID, addExtraTransientPropertyFn);
    },
    detachTransientProperties: function(task, ownerUUID) {
      var detachExtraTransientPropertyFunctions = [copyDateToDue, copyTransientDescriptionToPersistent];
      return ExtendedItemService.detachTransientProperties(task, ownerUUID,
                                                           detachExtraTransientPropertyFunctions);
    },

    // Regular expressions for task requests
    putNewTaskRegex: new RegExp(BackendClientService.apiPrefixRegex.source +
                                BackendClientService.uuidRegex.source +
                                taskRegex.source),

    putExistingTaskRegex: new RegExp(BackendClientService.apiPrefixRegex.source +
                                     BackendClientService.uuidRegex.source +
                                     taskSlashRegex.source +
                                     BackendClientService.uuidRegex.source),

    deleteTaskRegex: new RegExp(BackendClientService.apiPrefixRegex.source +
                                BackendClientService.uuidRegex.source +
                                taskSlashRegex.source +
                                BackendClientService.uuidRegex.source),

    undeleteTaskRegex: new RegExp(BackendClientService.apiPrefixRegex.source +
                                  BackendClientService.uuidRegex.source +
                                  taskSlashRegex.source +
                                  BackendClientService.uuidRegex.source +
                                  BackendClientService.undeleteRegex.source),

    completeTaskRegex: new RegExp(BackendClientService.apiPrefixRegex.source +
                                  BackendClientService.uuidRegex.source +
                                  taskSlashRegex.source +
                                  BackendClientService.uuidRegex.source +
                                  completeRegex.source),

    uncompleteTaskRegex: new RegExp(BackendClientService.apiPrefixRegex.source +
                                    BackendClientService.uuidRegex.source +
                                    taskSlashRegex.source +
                                    BackendClientService.uuidRegex.source +
                                    uncompleteRegex.source),
  };
}

TasksService['$inject'] = ['$q', '$rootScope',
  'ArrayService', 'BackendClientService', 'ExtendedItemService', 'ListsService', 'TagsService',
  'UISessionService', 'UserSessionService', 'UUIDService'];
angular.module('em.tasks').factory('TasksService', TasksService);
