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

 function EditorController($rootScope, $scope, $timeout,
                           ConvertService, ItemsService, SwiperService, UISessionService,
                           UserSessionService) {

  // OPENING, INITIALIZING, CLOSING

  var dataInEdit;
  $scope.initializeEditor = function(editorType, data, mode){
    // Reset $scope variables. These may exist from previous editor.
    $scope.task = undefined;
    $scope.note = undefined;
    $scope.list = undefined;
    $scope.item = undefined;
    $scope.tag = undefined;
    $scope.iterableItems = undefined;
    dataInEdit = data;

    $scope.editorType = editorType;
    $scope.editorVisible = true;
    $scope.mode = mode;

    if (editorType === 'task'){
      $scope.task = dataInEdit;
    }else if (editorType === 'note'){
      $scope.note = dataInEdit;
    }else if (editorType === 'list'){
      if (dataInEdit.list){
        // Shared/adopted list
        $scope.list = dataInEdit.list;
        $scope.overrideOwnerUUID = dataInEdit.owner;
        $scope.mode = 'extrinsic';
      }else{
        $scope.list = dataInEdit;
      }
    }else if (editorType === 'item'){
      $scope.item = dataInEdit;
    }else if (editorType === 'tag'){
      $scope.tag = dataInEdit;
    }else if (editorType === 'user'){
      $scope.user = dataInEdit ? dataInEdit : UserSessionService.getUser();
    }else if (editorType === 'recurring') {
      $scope.iterableItems = dataInEdit;
    }
  };

  function editorAboutToClose() {
    if (typeof featureEditorAboutToCloseCallback === 'function') featureEditorAboutToCloseCallback();
  }

  // Callback from Snap.js, outside of AngularJS event loop
  function editorOpened() {

    if (featureEditorOpenedCallback) featureEditorOpenedCallback();

    var preventFocus;

    if ($scope.editorType === 'recurring' ||
        ($scope.mode !== 'new' &&  ($scope.editorType === 'task' || $scope.editorType === 'note')))
    {
      preventFocus = true;
    }

    if (!preventFocus && (!dataInEdit || !dataInEdit.deleted) &&
        typeof titleBarInputFocusCallbackFunction === 'function')
    {
      // Focus on found and not deleted item
      setFocusOnTitlebarInput();
    }
  }

  // Callback from Snap.js, outside of AngularJS event loop
  function editorClosed() {
    // Don't manipulate list items in list before editor has been closed.
    UISessionService.resolveDeferredActions('edit');

    // NOTE: Call $apply here if these don't seem to be reseted
    $scope.editorType = undefined;
    $scope.mode = undefined;
    $scope.editorVisible = false;
    titleBarInputFocusCallbackFunction = titleBarInputBlurCallbackFunction = undefined;
    featureEditorAboutToCloseCallback = undefined;
  }

  if (angular.isFunction($scope.registerEditorAboutToOpenCallback))
    $scope.registerEditorAboutToOpenCallback($scope.initializeEditor, 'EditorController');

  if (angular.isFunction($scope.registerEditorAboutToCloseCallback))
    $scope.registerEditorAboutToCloseCallback(editorAboutToClose, 'EditorController');

  if (angular.isFunction($scope.registerEditorClosedCallback))
    $scope.registerEditorClosedCallback(editorClosed, 'EditorController');

  if (angular.isFunction($scope.registerEditorOpenedCallback))
    $scope.registerEditorOpenedCallback(editorOpened, 'EditorController');

  $scope.$on('$destroy', function() {
    if (angular.isFunction($scope.unregisterEditorAboutToOpenCallback))
      $scope.unregisterEditorAboutToOpenCallback('EditorController');

    if (angular.isFunction($scope.unregisterEditorAboutToCloseCallback))
      $scope.unregisterEditorAboutToCloseCallback('EditorController');

    if (angular.isFunction($scope.unregisterEditorOpenedCallback))
      $scope.unregisterEditorOpenedCallback('EditorController');

    if (angular.isFunction($scope.unregisterEditorClosedCallback))
      $scope.unregisterEditorClosedCallback('EditorController');

    if (angular.isFunction($scope.unregisterBackCallback))
      $scope.unregisterBackCallback('EditorController');
  });

  $scope.closeEditor = function(){
    if ($scope.mode === 'search' || $scope.mode === 'keywordEdit'){
      $scope.editorType = 'omnibar';
      $scope.mode = undefined;
      $scope.closeEditorDrawer(true);
    }else{
      $scope.closeEditorDrawer();
    }
  };

  $scope.processClose = $scope.closeEditor;

  function editorHasSwiper(){
    return ($scope.editorType === 'task' || $scope.editorType === 'note' || $scope.editorType === 'list');
  }

  function getEditorSwiperId(){
    return $scope.editorType + 'Editor';
  }

  // HELPER METHODS

  var featureEditorAboutToCloseCallback, featureEditorOpenedCallback;
  $scope.registerFeatureEditorAboutToCloseCallback = function(callback) {
    featureEditorAboutToCloseCallback = callback;
  };
  $scope.unregisterEditorAboutToCloseCallback = function() {
    featureEditorAboutToCloseCallback = undefined;
  };
  $scope.registerFeatureEditorOpenedCallback = function(callback) {
    featureEditorOpenedCallback = callback;
  };

  $scope.deferEdit = function(){
    return UISessionService.deferAction('edit', $rootScope.EDITOR_CLOSED_FAILSAFE_TIME);
  };

  function generateItemDeletedDelayedNotification(item, undeleteFn) {
    UISessionService.pushDelayedNotification({
      type: 'deleted',
      itemType: item.trans.itemType,
      item: item,
      undoFn: undeleteFn
    });

    $timeout(function() {
      UISessionService.activateDelayedNotifications();
    }, $rootScope.LIST_ITEM_LEAVE_ANIMATION_SPEED);
  }

  // DELETING
  $scope.processDelete = function(dataInEdit, deleteCallback, undeleteFn) {
    $scope.closeEditor();
    $scope.deferEdit().then(function() {
      UISessionService.allow('leaveAnimation', 200);
      var deletePromise = deleteCallback(dataInEdit);
      if (deletePromise) {
        deletePromise.then(function() {
          generateItemDeletedDelayedNotification(dataInEdit, undeleteFn);
        });
      } else {
        generateItemDeletedDelayedNotification(dataInEdit, undeleteFn);
      }
    });
  };

  // CONVERTING

  function handleConvertError(error) {
    var message;
    if (error.type === 'parent') {
      message = 'can\'t convert list with content';
    } else if (error.type === 'reminders') {
      message = 'can\'t convert task with reminders';
    }
    UISessionService.pushNotification({
      type: 'fyi',
      text: message
    });
  }

  $scope.convertToNote = function(dataInEdit){
    var convertToNotePromise;
    if (dataInEdit.trans.itemType === 'item') {
      convertToNotePromise = ItemsService.itemToNote(dataInEdit);
    }
    else if (dataInEdit.trans.itemType === 'task') {
      convertToNotePromise = ConvertService.finishTaskToNoteConvert(dataInEdit,
                                                                    UISessionService.getActiveUUID());
    }
    else if (dataInEdit.trans.itemType === 'list') {
      convertToNotePromise = ConvertService.finishListToNoteConvert(dataInEdit,
                                                                    UISessionService.getActiveUUID());
    }

    if (convertToNotePromise){
      convertToNotePromise.then(function(note){
        $scope.initializeEditor('note', note);
      }, handleConvertError);
    }
  };

  $scope.convertToTask = function(dataInEdit){
    var convertToTaskPromise;
    if (dataInEdit.trans.itemType === 'item') {
      convertToTaskPromise = ItemsService.itemToTask(dataInEdit);
    }
    else if (dataInEdit.trans.itemType === 'note') {
      convertToTaskPromise = ConvertService.finishNoteToTaskConvert(dataInEdit,
                                                                    UISessionService.getActiveUUID());
    } else if (dataInEdit.trans.itemType === 'list') {
      convertToTaskPromise = ConvertService.finishListToTaskConvert(dataInEdit,
                                                                    UISessionService.getActiveUUID());
    }
    if (convertToTaskPromise){
      convertToTaskPromise.then(function(task){
        $scope.initializeEditor('task', task);
      }, handleConvertError);
    }
  };

  $scope.convertToList = function(dataInEdit){
    var convertToListPromise;
    if (dataInEdit.trans.itemType === 'item'){
      convertToListPromise = ItemsService.itemToList(dataInEdit);
    }
    else if (dataInEdit.trans.itemType === 'task') {
      convertToListPromise = ConvertService.finishTaskToListConvert(dataInEdit,
                                                                    UISessionService.getActiveUUID());
    }
    else if (dataInEdit.trans.itemType === 'note') {
      convertToListPromise = ConvertService.finishNoteToListConvert(dataInEdit,
                                                                    UISessionService.getActiveUUID());
    }
    if (convertToListPromise){
      convertToListPromise.then(function(list){
        $scope.initializeEditor('list', list);
      }, handleConvertError);
    }
  };

  // TITLEBAR

  var titleBarInputFocusCallbackFunction;
  var titleBarInputBlurCallbackFunction;

  $scope.registerTitleBarInputCallbacks = function (focusCallback, blurCallback) {
    titleBarInputFocusCallbackFunction = focusCallback;
    titleBarInputBlurCallbackFunction = blurCallback;
  };

  function setFocusOnTitlebarInput() {
    if (typeof titleBarInputFocusCallbackFunction === 'function') titleBarInputFocusCallbackFunction();
  }
  function blurTitlebarInput() {
    if (typeof titleBarInputBlurCallbackFunction === 'function') titleBarInputBlurCallbackFunction();
  }

  $scope.handleBasicTitlebarKeydown = function(keydownEvent/*, item*/){
    // Escape
    if (keydownEvent.keyCode === 27){
      blurTitlebarInput();
    }
  };

  $scope.handleTitlebarEnterAction = function(callback) {
    $scope.closeEditor();
    if (typeof callback === 'function') callback();
  };

  $scope.calculateTitleWidth = function() {
    if ($rootScope.currentWidth >= $rootScope.EDITOR_MAX_WIDTH) {
      // Maximum width for column
      return $rootScope.TITLEBAR_HEADING_MAX_WIDTH;
    } else {
      // Smaller, leave
      return $rootScope.currentWidth - $rootScope.TITLEBAR_BUTTON_WIDTH*2;
    }
  };

  // NAVIGATION

  $scope.isFirstSlide = function(swiper){
    return SwiperService.isSlideActive(swiper + '/basic');
  };

  $scope.swipeToAdvanced = function(swiper) {
    SwiperService.swipeTo(swiper + '/advanced');
  };

  $scope.swipeToBasic = function(swiper) {
    SwiperService.swipeTo(swiper + '/basic');
  };

  $scope.editorSwiperSlideChanged = function(){
    // Need to digest on slide change to get changes to header to bite
    if (!$rootScope.$$phase && !$scope.$$phase)
      $scope.$digest();
  };

  $scope.getEditorNavigationBackClasses = function(){
    if (($scope.mode === 'search') ||
        (editorHasSwiper() && !$scope.isFirstSlide(getEditorSwiperId())) ||
        ($scope.mode === 'keywordEdit' && $scope.editorType == 'tag')){
      return 'not-swipeable';
    }
  };

  // LIST PICKER WIDGET

  $scope.openListPicker = function() {
    $scope.listPickerOpen = true;
  };
  $scope.closeListPicker = function() {
    $scope.listPickerOpen = false;
  };

  $scope.closeListPickerAndSetListToItem = function(item, list, callback) {

    function doCloseAndSave() {
      $scope.closeListPicker();
      item.trans.list = list;
      if (typeof callback === 'function') callback();
    }

    if (!list.trans.uuid) {// List is new, save it first. Close list picker on error saving new list.
      $scope.saveList(list).then(doCloseAndSave, $scope.closeListPicker);
    }
    else
      doCloseAndSave();
  };

  $scope.closeListPickerAndClearListFromItem = function(item, list, callback) {
    $scope.closeListPicker();
    if (item.trans.list === list){
      item.trans.list = undefined;
    }
    if (typeof callback === 'function') callback();
  };

  var editorFooterCloseCallback;
  $scope.registerEditorFooterCloseCallback = function(callback) {
    editorFooterCloseCallback = callback;
  };

  $scope.setTitleBarFocus = function() {
    if (typeof editorFooterCloseCallback === 'function') editorFooterCloseCallback();
  };

  // TEXT PROPERTIES (i.e. description, url and content)

  $scope.setTextPropertyFocus = function(name, hasFocus){
    if (hasFocus) $scope.focusedTextProperty = name;
    else $scope.focusedTextProperty = undefined;
    if (editorHasSwiper()){
      SwiperService.setOnlyExternal(getEditorSwiperId(), hasFocus);
    }
  };

  // URL

  $scope.setUrlFocus = function(value) {
    $scope.urlFocused = value;
  };

  $scope.hasSwipeToClose = function(editorItemType) {
    if ($scope.editorType === 'recurring' && $scope.mode !== editorItemType) {
      // Prevent swipe to close in recurring editor with wrong mode.
      return false;
    }
    return true;
  };

  $scope.isAutoSavingPrevented = function() {
    return $scope.editorType === 'recurring' || $scope.isOnboarding('notes');
  };

  // ***************
  // DEPRECATED! USE subEditor* FUNCTIONS!

  var propertyEditDoneCallbackData;
  $scope.registerPropertyEditDoneCallback = function(callback, parameters) {
    propertyEditDoneCallbackData = {
      fn: callback,
      parameters: parameters
    };
  };
  $scope.unregisterPropertyEditDoneCallbackData = function() {
    propertyEditDoneCallbackData = undefined;
  };

  $scope.propertyEditDone = function() {
    if (propertyEditDoneCallbackData && typeof propertyEditDoneCallbackData.fn === 'function') {
      propertyEditDoneCallbackData.fn.apply(undefined, propertyEditDoneCallbackData.parameters);
    }
  };

  var isPropertyEdited;
  $scope.registerIsPropertyEdited = function(callback) {
    isPropertyEdited = callback;
  };
  $scope.unregisterIsPropertyEdited = function() {
    isPropertyEdited = undefined;
  };

  $scope.isPropertyEdited = function() {
    if (typeof isPropertyEdited === 'function') return isPropertyEdited();
  };

  var isPickerOpenCondition;
  $scope.registerIsPickerOpenCondition = function(condition){
    isPickerOpenCondition = condition;
  };
  $scope.isPickerOpen = function(){
    if (angular.isFunction(isPickerOpenCondition)) return isPickerOpenCondition();
  };

  // DEPRECATED! USE subEditor* FUNCTIONS!
  // ***************

  // Only one subeditor can be open at a time
  var subEditorDoneCallbackData;
  $scope.registerSubEditorDoneCallback = function(callback, parameters) {
    subEditorDoneCallbackData = {
      fn: callback,
      parameters: parameters
    };
  };
  $scope.unregisterSubEditorDoneCallback = function() {
    subEditorDoneCallbackData = undefined;
  };
  $scope.subEditorDone = function() {
    if (subEditorDoneCallbackData && typeof subEditorDoneCallbackData.fn === 'function') {
      subEditorDoneCallbackData.fn.apply(undefined, subEditorDoneCallbackData.parameters);
    }
  };

  var hasSubEditorEdited;
  $scope.registerHasSubEditorEditedCallback = function(callback) {
    hasSubEditorEdited = callback;
  };
  $scope.unregisterHasSubEditorEditedCallback = function() {
    hasSubEditorEdited = undefined;
  };
  $scope.hasSubEditorEdited = function() {
    if (angular.isFunction(hasSubEditorEdited)) return hasSubEditorEdited();
  };

  var isSubEditorOpenCondition;
  $scope.registerIsSubEditorOpenCondition = function(condition){
    isSubEditorOpenCondition = condition;
  };
  $scope.isSubEditorOpen = function(){
    if (angular.isFunction(isSubEditorOpenCondition)) return isSubEditorOpenCondition();
  };

  $scope.isPropertyInEdit = function(){
    return $scope.focusedTextProperty !== undefined || $scope.isSubEditorOpen();
  };

  $scope.isOtherPropertyInEdit = function(exceptionTextProperty){
    if ($scope.focusedTextProperty === exceptionTextProperty){
      return false;
    }else{
      return $scope.isPropertyInEdit();
    }
  };

  $scope.getPropertyNameInEdit = function() {
    if ($scope.focusedTextProperty){
      if ($scope.focusedTextProperty === 'description'){
        return 'descrip' + ($scope.columns === 1 ? '-\n' : '') + 'tion'
      }else{
        return $scope.focusedTextProperty;
      }
    }
    else if ($scope.listPickerOpen)
      return 'list';
  };

  // EDITOR HEADER

  $scope.isEditorHeaderTitleVisible = function(){
    if ((editorHasSwiper() && !$scope.isFirstSlide(getEditorSwiperId())) ||
        $scope.isSubEditorOpen() ||
        $scope.focusedTextProperty ||
        $scope.urlFocused){
      return true;
    }
  };

  // BACK HANDLER

  function onBackButton(){
    // FIXME: REMOVE isPickerOpen & propertyEditDone WHEN THEY HAVE BEEN REMOVED
    if ($scope.isPickerOpen() || $scope.isSubEditorOpen()){
      $scope.propertyEditDone();
      $scope.subEditorDone();
    }else{
      $scope.closeEditor();
    }
    if (!$rootScope.$$phase && !$scope.$$phase){
      $scope.$digest();
    }
    return true;
  }
  if (angular.isFunction($scope.registerBackCallback))
    $scope.registerBackCallback(onBackButton, 'EditorController');

  // OMNIBAR

  $scope.isOmnibarEditorLoaded = function(){
    return $scope.editorType === 'omnibar' || $scope.mode === 'search' || $scope.mode === 'keywordEdit';
  };

}

EditorController['$inject'] = ['$rootScope', '$scope', '$timeout',
'ConvertService', 'ItemsService', 'SwiperService', 'UISessionService', 'UserSessionService'];
angular.module('em.main').controller('EditorController', EditorController);
