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

 function listPickerDirective($rootScope) {
  return {
    restrict: 'A',
    templateUrl: $rootScope.urlBase + 'app/base/listPicker.html',
    scope: {
      lists: '=listPicker',
      type: '@listPickerType',
      prefix: '@listPickerPrefix',
      getNewList: '&?listPickerNewItem',
      getSelectedList: '&listPickerGetSelected',
      getThisList: '&listPickerGetThisList',
      closeAndSave: '&listPickerSave',
      closeAndClearList: '&listPickerClear',
      registerSaveNewListCallback: '&listPickerRegisterSaveNewListCallback',
      unregisterSaveNewListCallback: '&listPickerUnregisterSaveNewListCallback',
      registerIsEditedCallback: '&listPickerRegisterIsEditedCallback',
      unregisterIsEditedCallback: '&listPickerUnregisterIsEditedCallback'
    },
    link: function(scope) {
      scope.newList = scope.getNewList();
      scope.selectedList = scope.getSelectedList();
      scope.thisList = scope.getThisList();
      scope.type = scope.type || 'list';

      scope.registerSaveNewListCallback({saveNewList: saveNewList});
      function saveNewList() {
        if (scope.newList.trans.title && scope.newList.trans.title.length > 0) {
          if (scope.prefix) {
            // TODO: css
            if (scope.newList.trans.title.length === 1) {
              // Title has only prefix. Do not save.
              scope.listCleared(scope.newList);
              return;
            } else {
              // Trim prefix from the title.
              scope.newList.trans.title = scope.newList.trans.title.substring(1);
            }
          }
          scope.listSelected(scope.newList);
        } else {
          scope.listCleared(scope.newList);
        }
      }

      scope.registerIsEditedCallback({isEdited: isEdited});
      function isEdited() {
        return scope.newList && scope.newList.trans.title && scope.newList.trans.title.length;
      }

      if (angular.isObject(scope.lists)){
        scope.useSubHeadings = true;
        scope.upperSubHeading = scope.lists.upperHeading;
        scope.lowerSubHeading = scope.lists.lowerHeading;
      }

      scope.getUpperLists = function(){
        if (angular.isArray(scope.lists)){
          return scope.lists;
        }else if (angular.isObject(scope.lists)){
          return scope.lists.upperArray;
        }
      };

      scope.getLowerLists = function(){
        if (angular.isObject(scope.lists)){
          return scope.lists.lowerArray;
        }
      };

      /*
      * Filter selected list from lists.
      */
      scope.notSelectedListAndNotThisList = function(list) {
        if (scope.selectedList) {
          if (list.trans.uuid) {
            // Compare with uuid.
            if (scope.selectedList.trans.uuid && list.trans.uuid === scope.selectedList.trans.uuid) {
              return false;
            }
          } else {
            // Compare with title.
            if (scope.selectedList.trans.title === list.trans.title) {
              return false;
            }
          }
        }
        if (scope.thisList) {
          if (list.trans.uuid === scope.thisList.trans.uuid) {
            return false;
          }
        }

        return true;
      };

      scope.listSelected = function(list) {
        scope.closeAndSave({list: list});
      };

      scope.listCleared = function(list) {
        scope.closeAndClearList({list: list});
      };

      scope.textareaKeyDown = function(event) {
        if (event.keyCode === 13) { // RETURN button
          // Enter in add item saves, no line breaks allowed
          if (scope.newList.trans.title && scope.newList.trans.title.length > 0) {
            if (scope.prefix) {
              // TODO: css
              if (scope.newList.trans.title.length === 1) {
                // Title has only prefix. Do not save.
                event.preventDefault();
                event.stopPropagation();
                return;
              } else {
                // Trim prefix from the title.
                scope.newList.trans.title = scope.newList.trans.title.substring(1);
              }
            }
            scope.listSelected(scope.newList);
          }
          event.preventDefault();
          event.stopPropagation();
        }
      };

      var watch;
      function bindWatcher() {
        // TODO: css
        var preventWatch;
        if (watch) return;  // no rebind

        watch = scope.$watch('newList.trans.title', function(newTitle) {
          if (preventWatch) {
            preventWatch = false;
            return;
          }

          if (!newTitle) {
            // Title cleared. Add prefix.
            preventWatch = true;
            scope.newList.trans.title = scope.prefix;
            return;
          } else if (newTitle) {
            // New title.
            if (newTitle.charAt(0) !== scope.prefix) {
              // Add prefix to first character of title.
              scope.newList.trans.title = scope.prefix + newTitle;
            }
          }
        });
      }

      scope.watchForTitleChange = function() {
        if (scope.prefix) bindWatcher();
      };

      scope.$on('$destroy', function() {
        scope.unregisterSaveNewListCallback();
        scope.unregisterIsEditedCallback();
      });
    }
  };
}
listPickerDirective['$inject'] = ['$rootScope'];
angular.module('em.base').directive('listPicker', listPickerDirective);
