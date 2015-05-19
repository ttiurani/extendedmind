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
 'use strict';

 function ListsController($scope,
                          AnalyticsService, ListsService, SwiperService, UISessionService, UserService,
                          UserSessionService) {

  if (angular.isFunction($scope.registerArrayChangeCallback)) {
    $scope.registerArrayChangeCallback('lists', ['active', 'archived'], invalidateListsArrays,
                                       'ListsController');
  }

  var cachedListsArrays = {};

  function invalidateAllLists(cachedLists, ownerUUID) {
    updateActiveAndArchivedLists(cachedLists, ownerUUID);
    updateAllLists(cachedLists, ownerUUID);
  }
  /*
  * Invalidate cached active lists arrays.
  */
  function invalidateListsArrays(lists, modifiedList, listsType, ownerUUID) {
    if (cachedListsArrays[ownerUUID]) {
      var arrayType;
      if (listsType === 'active') {
        for (arrayType in cachedListsArrays[ownerUUID]) {
          if (cachedListsArrays[ownerUUID].hasOwnProperty(arrayType)) {
            if (arrayType === 'all') {
              invalidateAllLists(cachedListsArrays[ownerUUID], ownerUUID);
            } else if (arrayType === 'allParentless') {
              // TODO
            }
          }
        }
      } else if (listsType === 'archived') {
        for (arrayType in cachedListsArrays[ownerUUID]) {
          if (cachedListsArrays[ownerUUID].hasOwnProperty(arrayType)) {
            if (arrayType === 'all') {
              invalidateAllLists(cachedListsArrays[ownerUUID], ownerUUID);
            } else if (arrayType === 'allParentless') {
              // TODO
            }
          }
        }
      }
    }
  }

  function updateActiveAndArchivedLists(/*cachedLists, ownerUUID*/) {
    // TODO
  }

  function updateAllLists(/*cachedLists, ownerUUID*/) {
    // TODO
  }

  $scope.getListsArray = function(arrayType/*, info*/) {
    var ownerUUID = UISessionService.getActiveUUID();
    if (!cachedListsArrays[ownerUUID]) cachedListsArrays[ownerUUID] = {};

    switch (arrayType) {

      case 'all':
        // Needed in task/note list picker
      break;

      case 'allParentless':
        // Needed in parent list picker
      break;

      case 'active':
        // lists/active
      break;

      case 'archived':
        // lists/archived
      break;

    }
  };

  $scope.getNewList = function(initialValues) {
    return ListsService.getNewList(initialValues, UISessionService.getActiveUUID());
  };

  var featureChangedCallback = function featureChangedCallback(name, data/*, state*/) {
    if (name === 'list') {
      $scope.list = data;
    } else if (name === 'lists') {
      if ($scope.features.lists.getStatus('archived') === 'disabled'){
        SwiperService.setOnlyExternal('lists', true);
      }else{
        SwiperService.setOnlyExternal('lists', false);
      }
      if (data && data.archived) {
        // List was archived, swipe to archived lists slide.
        SwiperService.swipeTo('lists/archived');
      }
    }
  };
  UISessionService.registerFeatureChangedCallback(featureChangedCallback, 'ListsController');

  function updateFavoriteLists(favoriteListUuids){
    UserSessionService.setUIPreference('favoriteLists', favoriteListUuids);
    UserService.saveAccountPreferences();
    $scope.refreshFavoriteLists();
  }

  $scope.favoriteList = function(list) {
    if (list.trans.itemType === 'list') {
      var favoriteListUuids = UserSessionService.getUIPreference('favoriteLists');
      if (!favoriteListUuids) favoriteListUuids = [];
      if (favoriteListUuids.indexOf(list.trans.uuid) === -1){
        favoriteListUuids.push(list.trans.uuid);
        updateFavoriteLists(favoriteListUuids);
      }
    } else {
      list.trans.favorited = true;
    }
  };

  $scope.unfavoriteList = function(list) {
    if (list.trans.itemType === 'list') {
      var favoriteListUuids = UserSessionService.getUIPreference('favoriteLists');
      if (favoriteListUuids){
        var favoriteIndex = favoriteListUuids.indexOf(list.trans.uuid);
        if (favoriteIndex !== -1){
          favoriteListUuids.splice(favoriteIndex, 1);
          updateFavoriteLists(favoriteListUuids);
        }
      }
    } else {
      delete list.trans.favorited;
    }
  };

  // SAVING

  $scope.saveList = function(list) {
    if (list.trans.uuid){
      AnalyticsService.do('saveList');
    }else{
      AnalyticsService.do('addList');
    }
    return ListsService.saveList(list, UISessionService.getActiveUUID());
  };

  $scope.saveListAndChangeFeature = function(list) {
    var saveListDeferred = $scope.saveList(list);
    if (saveListDeferred){
      return saveListDeferred.then(function(savedList){
        $scope.changeFeature('list', savedList, true);
      });
    }
  };

  $scope.saveAndArchiveList = function(list){
    var saveListDeferred = $scope.saveList(list);
    if (saveListDeferred){
      return saveListDeferred.then(function(){
        return $scope.archiveList(list);
      });
    }
  };

  $scope.archiveList = function(list) {
    if (list.trans.uuid){
      AnalyticsService.do('archiveList');
      return ListsService.archiveList(list, UISessionService.getActiveUUID());
    }
  };

  $scope.saveAndUnarchiveList = function(list){
    var saveListDeferred = $scope.saveList(list);
    if (saveListDeferred){
      return saveListDeferred.then(function(){
        return $scope.unarchiveList(list);
      });
    }
  };

  $scope.unarchiveList = function(list) {
    if (list.trans.uuid){
      AnalyticsService.do('unarchiveList');
      return ListsService.unarchiveList(list, UISessionService.getActiveUUID());
    }
  };

  // (UN)DELETING

  $scope.deleteList = function(list) {
    if (list.trans.uuid){
      AnalyticsService.do('deleteList');
      return ListsService.deleteList(list, UISessionService.getActiveUUID());
    }
  };

  $scope.undeleteList = function(list) {
    if (list.trans.uuid){
      AnalyticsService.do('undeleteList');
      return ListsService.undeleteList(list, UISessionService.getActiveUUID());
    }
  };

  // Navigation

  $scope.saveListAndMoveToLists = function(list) {
    $scope.editListFields(list);
    $scope.changeFeature('lists');
  };
}

ListsController['$inject'] = ['$scope',
'AnalyticsService', 'ListsService', 'SwiperService', 'UISessionService', 'UserService', 'UserSessionService'
];
angular.module('em.base').controller('ListsController', ListsController);
