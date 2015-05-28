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

 /*global angular, jQuery */
 'use strict';

 function ListsService($q, ArrayService, BackendClientService, ExtendedItemService, ItemLikeService,
                       TagsService, UserSessionService) {
  var LIST_TYPE = 'list';

  var archivedFieldInfo = {
        name: 'archived',
        skipTransport: true,
        isEdited: function(){
          // Changing archived should not save list. Archiving is done with separate functions.
          return false;
        },
        resetTrans: function(list){
          if (list.mod && list.mod.hasOwnProperty('archived')){
            if (!list.mod.archived && list.trans.archived !== undefined) delete list.trans.archived;
            else list.trans.archived = list.mod.archived;
          }
          else if (list.archived !== undefined) list.trans.archived = list.archived;
          else if (list.trans.archived !== undefined) delete list.trans.archived;
        }
      };

  var listFieldInfos = ItemLikeService.getFieldInfos(
    [ 'due',
      archivedFieldInfo,
      // TODO
      // 'assignee',
      // 'assigner',
      // 'visibility',
      ExtendedItemService.getRelationshipsFieldInfo()
    ]
  );

  // Minimal field infos that are needed to sort lists in arrays
  var listMinimalFieldInfos = [
    'uuid',
    'created',
    'deleted',
    archivedFieldInfo];

  // An object containing lists for every owner
  var lists = {};

  var listSlashRegex = /\/list\//;
  var archiveRegex = /\/archive/;
  var unarchiveRegex = /\/unarchive/;
  var agreementRegex = /\/agreement/;
  var agreementSlashRegex = /\/agreement/;
  var acceptRegex = /\/accept/;
  var accessSlashRegex = /\/access\//;
  var resendRegex = /\/resend/;
  var integerRegex = /^\d+$/;

  // PUT /api/UUID/agreement
  var putShareListRegexp = new RegExp(
    /^/.source +
    BackendClientService.apiPrefixRegex.source +
    BackendClientService.uuidRegex.source +
    agreementRegex.source +
    /$/.source
  );

  // POST /api/UUID/agreement/HEX/accept
  var postAcceptShareListRegexp = new RegExp(
    /^/.source +
    BackendClientService.apiPrefixRegex.source +
    BackendClientService.uuidRegex.source +
    agreementSlashRegex.source +
    BackendClientService.hexCodeRegex.source +
    acceptRegex.source +
    /$/.source
  );

  // DELETE /api/UUID/agreement/UUID/
  var deleteShareListRegexp = new RegExp(
    /^/.source +
    BackendClientService.apiPrefixRegex.source +
    BackendClientService.uuidRegex.source +
    agreementSlashRegex.source +
    BackendClientService.uuidRegex.source +
    /$/.source
  );

  // POST /api/UUID/agreement/UUID/access/#
  var postSharedListAccessRegexp = new RegExp(
    /^/.source +
    BackendClientService.apiPrefixRegex.source +
    BackendClientService.uuidRegex.source +
    agreementSlashRegex.source +
    BackendClientService.uuidRegex.source +
    accessSlashRegex.source +
    integerRegex.source +
    /$/.source
  );

  // POST /api/UUID/agreement/UUID/resend
  var postResendShareListRegexp = new RegExp(
    /^/.source +
    BackendClientService.apiPrefixRegex.source +
    BackendClientService.uuidRegex.source +
    agreementSlashRegex.source +
    BackendClientService.uuidRegex.source +
    resendRegex.source +
    /$/.source
  );

  var itemArchiveCallbacks = {};
  var listDeletedCallbacks = {};
  var listUUIDChangedCallbacks = {};

  function initializeArrays(ownerUUID) {
    if (!lists[ownerUUID]) {
      lists[ownerUUID] = {
        activeLists: [],
        deletedLists: [],
        archivedLists: []
      };
    }
  }
  function notifyOwners(userUUID, collectives, sharedLists) {
    var extraOwners = ItemLikeService.processOwners(userUUID, collectives, sharedLists,
                                                    lists, initializeArrays);
    for (var i=0; i < extraOwners.length; i++){
      // Need to destroy data from this owner
      ItemLikeService.destroyPersistentItems(
        lists[extraOwners[i]].activeLists.concat(
            lists[extraOwners[i]].deletedLists).concat(lists[extraOwners[i]].archivedLists));
      delete lists[extraOwners[i]];
    }
  }
  UserSessionService.registerNofifyOwnersCallback(notifyOwners, 'ListsService');

  function getListInfo(value, ownerUUID, searchField){
    var field = searchField ? searchField : 'uuid';
    var list = lists[ownerUUID].activeLists.findFirstObjectByKeyValue(field, value, 'trans');
    if (list){
      return {
        type: 'active',
        list: list
      };
    }
    list = lists[ownerUUID].deletedLists.findFirstObjectByKeyValue(field, value, 'trans');
    if (list){
      return {
        type: 'deleted',
        list: list
      };
    }
    list = lists[ownerUUID].archivedLists.findFirstObjectByKeyValue(field, value, 'trans');
    if (list){
      return {
        type: 'archived',
        list: list
      };
    }
  }
  ExtendedItemService.registerGetListInfoCallback(getListInfo);

  function getOtherArrays(ownerUUID) {
    return [{array: lists[ownerUUID].archivedLists, id: 'archived'}];
  }

  function updateList(list, ownerUUID, oldItemUUID, propertiesToReset) {
    ItemLikeService.persistAndReset(list, LIST_TYPE, ownerUUID,
                                    listFieldInfos, oldItemUUID, propertiesToReset);
    return ArrayService.updateItem(ownerUUID, LIST_TYPE, list,
                                   lists[ownerUUID].activeLists,
                                   lists[ownerUUID].deletedLists,
                                   getOtherArrays(ownerUUID));
  }

  function setList(list, ownerUUID) {
    ItemLikeService.persistAndReset(list, LIST_TYPE, ownerUUID, listFieldInfos);
    ArrayService.setItem(ownerUUID, LIST_TYPE, list,
                         lists[ownerUUID].activeLists,
                         lists[ownerUUID].deletedLists,
                         getOtherArrays(ownerUUID));
  }

  return {
    getNewList: function(initialValues, ownerUUID) {
      return ItemLikeService.getNew(initialValues, LIST_TYPE, ownerUUID, listFieldInfos);
    },

    setLists: function(listsResponse, ownerUUID, skipPersist, addToExisting) {
      // To avoid problems with parent list not resetting to trans, we first store the response
      // to the arrays using minimal trans, then properly reset trans
      ItemLikeService.resetTrans(listsResponse, LIST_TYPE, ownerUUID, listMinimalFieldInfos);
      var latestModified;
      if (addToExisting){
        latestModified = ArrayService.updateArrays(ownerUUID, LIST_TYPE, listsResponse,
                                                       lists[ownerUUID].activeLists,
                                                       lists[ownerUUID].deletedLists,
                                                       getOtherArrays(ownerUUID));

      }else{
        latestModified = ArrayService.setArrays(ownerUUID, LIST_TYPE, listsResponse,
                                    lists[ownerUUID].activeLists,
                                    lists[ownerUUID].deletedLists,
                                    getOtherArrays(ownerUUID));
      }

      if (skipPersist){
        ItemLikeService.resetTrans(listsResponse, LIST_TYPE, ownerUUID, listFieldInfos);
      }else{
        ItemLikeService.persistAndReset(listsResponse, LIST_TYPE, ownerUUID, listFieldInfos);
      }
      return latestModified;
    },
    updateLists: function(listsResponse, ownerUUID) {
      if (listsResponse && listsResponse.length){
        // Go through listsResponse, and add .mod values if the fields in the current .mod do not match
        // the values in the persistent response
        var updatedLists = [], locallyDeletedLists = [], i, id;
        for (i=0; i<listsResponse.length; i++){
          var listInfo = this.getListInfo(listsResponse[i].uuid, ownerUUID);
          if (listInfo){
            if (listInfo.list.trans.deleted) locallyDeletedLists.push(listInfo.list);
            ItemLikeService.evaluateMod(listsResponse[i], listInfo.list,
                                        LIST_TYPE, ownerUUID, listFieldInfos);
            updatedLists.push(listInfo.list);
          }else{
            updatedLists.push(listsResponse[i]);
          }
        }

        // To avoid problems with parent list not resetting to trans, we first store the response
        // to the arrays using minimal trans, then properly reset trans
        ItemLikeService.resetTrans(updatedLists, LIST_TYPE, ownerUUID, listMinimalFieldInfos);
        var latestModified = ArrayService.updateArrays(ownerUUID, LIST_TYPE, updatedLists,
                                                       lists[ownerUUID].activeLists,
                                                       lists[ownerUUID].deletedLists,
                                                       getOtherArrays(ownerUUID));
        ItemLikeService.persistAndReset(updatedLists, LIST_TYPE, ownerUUID, listFieldInfos);
        if (latestModified) {
          // Go through response to see if something was deleted
          for (i=0; i<updatedLists.length; i++) {
            if (updatedLists[i].deleted) {
              for (id in listDeletedCallbacks) {
                listDeletedCallbacks[id](updatedLists[i], ownerUUID);
              }
            }else if (locallyDeletedLists.indexOf(updatedLists[i]) !== -1){
              // Undeleted in another client
              for (id in listDeletedCallbacks) {
                listDeletedCallbacks[id](updatedLists[i], ownerUUID, true);
              }
            }
          }
        }
        return latestModified;
      }
    },
    updateListModProperties: function(uuid, properties, ownerUUID) {
      var listInfo = this.getListInfo(uuid, ownerUUID);
      if (listInfo){
        if (!properties){
          if (listInfo.list.mod){
            delete listInfo.list.mod;
            updateList(listInfo.list, ownerUUID);
          }
        }else{
          if (!listInfo.list.mod) listInfo.list.mod = {};
          if (properties.associated) {
            // Delete associated array before update.
            delete properties.associated;
          }
          ItemLikeService.updateObjectProperties(listInfo.list.mod, properties);
          if (properties.uuid){
            updateList(listInfo.list, ownerUUID, uuid, properties);
            for (var id in listUUIDChangedCallbacks) {
              listUUIDChangedCallbacks[id](uuid, properties.uuid, ownerUUID);
            }
          }else{
            updateList(listInfo.list, ownerUUID, undefined, properties);
          }
        }
        return listInfo.list;
      }
    },
    updateListHistProperties: function(uuid, properties, ownerUUID) {
      var listInfo = this.getListInfo(uuid, ownerUUID);
      if (listInfo){
        if (!properties){
          if (listInfo.list.hist){
            delete listInfo.list.hist;
            updateList(listInfo.list, ownerUUID);
          }
        }else{
          if (!listInfo.list.hist) listInfo.list.hist = {};
          ItemLikeService.updateObjectProperties(listInfo.list.hist, properties);
          // Last parameter is to prevent unnecessary resetting of trans
          updateList(listInfo.list, ownerUUID, undefined, {});
          return listInfo.list;
        }
      }
    },
    getLists: function(ownerUUID) {
      return lists[ownerUUID].activeLists;
    },
    getArchivedLists: function(ownerUUID) {
      return lists[ownerUUID].archivedLists;
    },
    getDeletedLists: function(ownerUUID) {
      return lists[ownerUUID].deletedLists;
    },
    getModifiedLists: function(ownerUUID) {
      return ArrayService.getModifiedItems(lists[ownerUUID].activeLists,
                                            lists[ownerUUID].deletedLists,
                                            getOtherArrays(ownerUUID));
    },
    getListInfo: function(value, ownerUUID, searchField) {
      return getListInfo(value, ownerUUID, searchField);
    },
    saveList: function(list) {
      var deferred = $q.defer();
      var ownerUUID = list.trans.owner;
      if (lists[ownerUUID].deletedLists.findFirstObjectByKeyValue('uuid', list.trans.uuid, 'trans')) {
        deferred.reject({type: 'deleted'});
      } else {
        ItemLikeService.save(list, LIST_TYPE, ownerUUID, listFieldInfos).then(
          function(result){
            if (result === 'new') setList(list, ownerUUID);
            else if (result === 'existing') updateList(list, ownerUUID);
            deferred.resolve(result);
          }, function(failure){
            deferred.reject(failure);
          }
        );
      }
      return deferred.promise;
    },
    isListEdited: function(list) {
      var ownerUUID = list.trans.owner;
      return ItemLikeService.isEdited(list, LIST_TYPE, ownerUUID, listFieldInfos);
    },
    resetList: function(list) {
      var ownerUUID = list.trans.owner;
      return ItemLikeService.resetTrans(list, LIST_TYPE, ownerUUID, listFieldInfos);
    },
    getListStatus: function(list) {
      var ownerUUID = list.trans.owner;
      var arrayInfo = ArrayService.getActiveArrayInfo(list,
                                                      lists[ownerUUID].activeLists,
                                                      lists[ownerUUID].deletedLists,
                                                      getOtherArrays(ownerUUID));

      if (arrayInfo) return arrayInfo.type;
    },
    addList: function(list, ownerUUID) {
      setList(list, ownerUUID);
    },
    removeList: function(uuid, ownerUUID) {
      var listInfo = this.getListInfo(uuid, ownerUUID);
      if (listInfo) {
        // Notify others that this list will be removed => same callback as in when it is deleted
        for (var id in listDeletedCallbacks) {
          listDeletedCallbacks[id](listInfo.list, ownerUUID);
        }
        ItemLikeService.remove(listInfo.list.trans.uuid);
        ArrayService.removeFromArrays(ownerUUID, listInfo.list, LIST_TYPE,
                                      lists[ownerUUID].activeLists,
                                      lists[ownerUUID].deletedLists,
                                      getOtherArrays(ownerUUID));
      }

    },
    deleteList: function(list) {
      var ownerUUID = list.trans.owner;
      var deferred = $q.defer();
      if (lists[ownerUUID].deletedLists.findFirstObjectByKeyValue('uuid', list.trans.uuid, 'trans')) {
        deferred.resolve('unmodified');
      }else{
        ItemLikeService.processDelete(list, LIST_TYPE, ownerUUID, listFieldInfos).then(
          function(){
            updateList(list, ownerUUID);
            for (var id in listDeletedCallbacks) {
              listDeletedCallbacks[id](list, ownerUUID);
            }
            deferred.resolve(list);
          }, function(failure){
            deferred.reject(failure);
          }
        );
      }
      return deferred.promise;
    },
    undeleteList: function(list) {
      var ownerUUID = list.trans.owner;
      var deferred = $q.defer();
      if (!lists[ownerUUID].deletedLists.findFirstObjectByKeyValue('uuid', list.trans.uuid, 'trans')) {
        deferred.resolve('unmodified');
      }else{
        ItemLikeService.undelete(list, LIST_TYPE, ownerUUID, listFieldInfos).then(
          function(){
            updateList(list, ownerUUID);
            for (var id in listDeletedCallbacks) {
              listDeletedCallbacks[id](list, ownerUUID, true);
            }
            deferred.resolve(list);
          }, function(failure){
            deferred.reject(failure);
          }
        );
      }
      return deferred.promise;
    },
    archiveList: function(list) {
      function getArchiveUrl(params){
        return params.prefix + params.list.trans.uuid + '/archive';
      }
      var ownerUUID = list.trans.owner;
      // Check that list is active before trying to archive
      var deferred = $q.defer();
      if (lists[ownerUUID].deletedLists.findFirstObjectByKeyValue('uuid', list.trans.uuid, 'trans')) {
        deferred.reject({type: 'deleted'});
      }else if (lists[ownerUUID].archivedLists.findFirstObjectByKeyValue('uuid', list.trans.uuid, 'trans')) {
        deferred.resolve('unmodified');
      } else {
        BackendClientService.postOnline({ value: '/api/' + ownerUUID + '/list/' +
                                                 list.trans.uuid + '/archive',
                                          refresh: getArchiveUrl,
                                          params: {
                                            prefix: '/api/' + ownerUUID + '/list/',
                                            list: list }},
                                        this.archiveListRegex)
        .then(function(response) {
          list.archived = response.archived;
          ItemLikeService.updateObjectProperties(list, response.result);

          // Add generated tag to the tag array
          TagsService.setGeneratedTag(response.history, ownerUUID);

          // Add generated tag to list tags array
          if (!list.relationships) list.relationships = {};
          if (!list.relationships.tags) list.relationships.tags = [];
          list.relationships.tags.push(response.history.uuid);

          // Update list
          updateList(list, ownerUUID);

          // Call child callbacks
          if (response.children) {
            for (var id in itemArchiveCallbacks) {
              itemArchiveCallbacks[id](response.children, response.archived, response.history, ownerUUID);
            }
          }
          deferred.resolve();
        },function(error){
          deferred.reject(error);
        });
      }
      return deferred.promise;
    },
    unarchiveList: function(list) {
      function getUnarchiveUrl(params){
        return params.prefix + params.list.trans.uuid + '/unarchive';
      }
      var ownerUUID = list.trans.owner;
      // Check that list is archived before trying to unarchive
      var deferred = $q.defer();
      if (lists[ownerUUID].deletedLists.findFirstObjectByKeyValue('uuid', list.trans.uuid, 'trans')) {
        deferred.reject({type: 'deleted'});
      }else if (lists[ownerUUID].activeLists.findFirstObjectByKeyValue('uuid', list.trans.uuid, 'trans')) {
        deferred.resolve('unmodified');
      } else {
        BackendClientService.postOnline({ value: '/api/' + ownerUUID + '/list/' +
                                                 list.trans.uuid + '/unarchive',
                                          refresh: getUnarchiveUrl,
                                          params: {
                                            prefix: '/api/' + ownerUUID + '/list/',
                                            list: list }},
                                        this.unarchiveListRegex)
        .then(function(response) {
          if (list.archived) delete list.archived;
          ItemLikeService.updateObjectProperties(list, response.result);
          updateList(list, ownerUUID);

          // Update the history tag
          var historyTag = TagsService.getTagInfo(response.history.result.uuid, ownerUUID);
          if (historyTag){
            historyTag.tag.deleted = response.history.deleted;
            historyTag.tag.modified = response.history.result.modified;
            TagsService.updateTag(historyTag.tag, ownerUUID);
          }

          // Call child callbacks with unarchive=true
          if (response.children) {
            for (var id in itemArchiveCallbacks) {
              itemArchiveCallbacks[id](response.children, undefined,
                                       historyTag.tag ? historyTag.tag : undefined, ownerUUID, true);
            }
          }
          deferred.resolve();
        },function(error){
          deferred.reject(error);
        });
      }
      return deferred.promise;
    },
    shareList: function(/*listShareData*/) {
      // TODO
      return $q(function(resolve/*, reject*/) {
        resolve();
        // reject();
      });
    },
    unshareList: function(/*uuid*/) {
      // TODO
      return $q(function(resolve/*, reject*/) {
        resolve();
        // reject();
      });
    },
    updateExistingListShareAccess: function(/*uuid*/) {
      // TODO
      return $q(function(resolve/*, reject*/) {
        resolve();
        // reject();
      });
    },
    removeListShare: function(/*uuid*/) {
      // TODO
      return $q(function(resolve/*, reject*/) {
        resolve();
        // reject();
      });
    },
    resendListShare: function(/*uuid*/) {
      // TODO
      return $q(function(resolve/*, reject*/) {
        resolve();
        // reject();
      });
    },
    clearLists: function() {
      lists = {};
    },
    changeOwnerUUID: function(oldUUID, newUUID){
      if (lists[oldUUID]){
        lists[newUUID] = lists[oldUUID];
        delete lists[oldUUID];
        ItemLikeService.persistAndReset(lists[newUUID].activeLists, LIST_TYPE, newUUID, listFieldInfos);
        ItemLikeService.persistAndReset(lists[newUUID].archivedLists, LIST_TYPE, newUUID, listFieldInfos);
        ItemLikeService.persistAndReset(lists[newUUID].deletedLists, LIST_TYPE, newUUID, listFieldInfos);
      }
    },
    listFieldInfos: listFieldInfos,
    // Regular expressions for list requests
    putNewListRegex: ItemLikeService.getPutNewRegex(LIST_TYPE),
    putExistingListRegex: ItemLikeService.getPutExistingRegex(LIST_TYPE),
    deleteListRegex: ItemLikeService.getDeleteRegex(LIST_TYPE),
    undeleteListRegex: ItemLikeService.getUndeleteRegex(LIST_TYPE),
    archiveListRegex: new RegExp('^' +
                                 BackendClientService.apiPrefixRegex.source +
                                 BackendClientService.uuidRegex.source +
                                 listSlashRegex.source +
                                 BackendClientService.uuidRegex.source +
                                 archiveRegex.source +
                                 '$'),
    unarchiveListRegex: new RegExp('^' +
                                 BackendClientService.apiPrefixRegex.source +
                                 BackendClientService.uuidRegex.source +
                                 listSlashRegex.source +
                                 BackendClientService.uuidRegex.source +
                                 unarchiveRegex.source +
                                 '$'),
    putShareListRegex: putShareListRegexp,
    postAcceptShareListRegex: postAcceptShareListRegexp,
    deleteShareListRegex: deleteShareListRegexp,
    postSharedListAccessRegex: postSharedListAccessRegexp,
    postResendShareListRegex: postResendShareListRegexp,

    // Register callbacks that are fired for implicit archiving of
    // elements. Callback must return the latest modified value it
    // stores to its arrays.
    registerItemArchiveCallback: function(itemArchiveCallback, id) {
      itemArchiveCallbacks[id] = itemArchiveCallback;
    },
    registerListDeletedCallback: function(listDeletedCallback, id) {
      listDeletedCallbacks[id] = listDeletedCallback;
    },
    registerListUUIDChangedCallback: function(listUUIDChangedCallback, id) {
      listUUIDChangedCallbacks[id] = listUUIDChangedCallback;
    },
    removeDeletedListFromItems: function(items, deletedList) {
      var modifiedItems = [];
      for (var i = 0, len = items.length; i < len; i++) {
        var found = false;
        if (items[i].relationships && items[i].relationships.parent === deletedList.trans.uuid) {
          found = true;
          delete items[i].relationships.parent;
          if (jQuery.isEmptyObject(items[i].relationships)){
            delete items[i].relationships;
          }

        }
        if (items[i].mod && items[i].mod.relationships &&
                  items[i].mod.relationships.parent === deletedList.trans.uuid){
          found = true;
          items[i].mod.relationships.parent = undefined;
        }
        if (found){
          // Add deleted list to item history
          if (!items[i].hist) items[i].hist = {};
          items[i].hist.deletedList = deletedList.trans.uuid;
          modifiedItems.push(items[i]);
        }
      }
      return modifiedItems;
    },
    addUndeletedListToItems: function(items, deletedList) {
      var modifiedItems = [];
      for (var i = 0, len = items.length; i < len; i++) {
        if (items[i].hist && items[i].hist.deletedList === deletedList.trans.uuid) {
          // Only add to mod if not already in persistent fields
          if (!items[i].relationships || items[i].relationships.parent !== deletedList.trans.uuid){
            if (!items[i].mod) items[i].mod = {};
            if (!items[i].mod.relationships) items[i].mod.relationships = {};
            items[i].mod.relationships.parent = deletedList.trans.uuid;
          }
          delete items[i].hist.deletedList;
          if (jQuery.isEmptyObject(items[i].hist)) delete items[i].hist;
          modifiedItems.push(items[i]);
        }
      }
      return modifiedItems;
    }
  };
}

ListsService['$inject'] = ['$q', 'ArrayService', 'BackendClientService', 'ExtendedItemService',
                           'ItemLikeService', 'TagsService', 'UserSessionService'];
angular.module('em.lists').factory('ListsService', ListsService);
