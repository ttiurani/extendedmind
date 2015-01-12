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

 function NoteEditorController($scope, NotesService, TagsService, UISessionService) {

  // INITIALIZING

  if (angular.isFunction($scope.registerFeatureEditorAboutToCloseCallback))
    $scope.registerFeatureEditorAboutToCloseCallback(noteEditorAboutToClose, 'NoteEditorController');

  // SAVING, DELETING

  function saveNoteInEdit() {
    // TODO: Keywords
    $scope.deferEdit().then(function() {
      $scope.saveNote($scope.note);
    });
  }

  $scope.deleteNoteInEdit = function() {
    // Unregister about to close callback, because delete is run after editor is closed
    // and about to close callback would try to save item in between close and delete.
    if (angular.isFunction($scope.unregisterEditorAboutToCloseCallback))
      $scope.unregisterEditorAboutToCloseCallback();

    $scope.closeNoteEditor();
    $scope.deferEdit().then(function() {
      UISessionService.allow('leaveAnimation', 200);
      $scope.deleteNote($scope.note);
    });
  };

  $scope.isNoteEdited = function() {
    // Note without title is unedited
    if ($scope.noteTitlebarHasText()) {
      return NotesService.isNoteEdited($scope.note, UISessionService.getActiveUUID());
    }
  };

  $scope.endNoteEdit = function() {
    $scope.closeNoteEditor();
  };

  function noteEditorAboutToClose() {
    if ($scope.isNoteEdited() && !$scope.note.deleted) saveNoteInEdit();
    else NotesService.resetNote($scope.note, UISessionService.getActiveUUID());
  }

  $scope.clickFavorite = function() {
    if (!$scope.note.trans.favorited){
      $scope.favoriteNote($scope.note);
    }else{
      $scope.unfavoriteNote($scope.note);
    }
  };

  // MODES

  $scope.noteContentFocused = function(){
    $scope.contentFocused = true;
  };

  $scope.noteContentBlurred = function() {
    $scope.contentFocused = false;
  };

  $scope.openNoteTitleEdit = function() {
    // TODO: Scroll and swipe
  };

  $scope.isNotePropertyInEdit = function() {
    return $scope.contentFocused || $scope.isPickerOpen();
  };

  $scope.isEndNoteEditActionHidden = function() {
    return $scope.isPickerOpen();
  };

  $scope.isPickerOpen = function() {
    return $scope.listPickerOpen || $scope.keywordsPickerOpen;
  };

  // CONTENT

  var noteContentFocusCallback;
  $scope.registerNoteContentInputCallbacks = function(focus){
    noteContentFocusCallback = focus;
  };

  // TITLEBAR

  $scope.noteTitlebarHasText = function() {
    return $scope.note.trans.title && $scope.note.trans.title.length !== 0;
  };

  $scope.noteTitlebarTextKeyDown = function (keydownEvent) {
    $scope.handleBasicTitlebarKeydown(keydownEvent, $scope.note);
    // Return
    if (event.keyCode === 13 && $scope.noteTitlebarHasText()) {
      // TODO: Move focus to content field on enter!
      noteContentFocusCallback();
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // KEYWORDS

  function clearKeyword() {
    $scope.newKeyword = TagsService.getNewTag({tagType: 'keyword'}, UISessionService.getActiveUUID());
  }
  clearKeyword(); // Initialize new keyword.

  $scope.addNewKeywordToNote = function(note, newKeyword) {
    if (!newKeyword || !newKeyword.trans.title) return; // No text entered.
    if (note.trans.keywords) {
      var noteKeyword = note.trans.keywords.findFirstObjectByKeyValue('title', newKeyword.trans.title);

      if (noteKeyword !== undefined) {
        // Note's existing keyword. Do not re-add.
        clearKeyword();
        return;
      }
    }

    var keywordToAdd = $scope.keywords.findFirstObjectByKeyValue('title', newKeyword.trans.title,
                                                                 'trans') || newKeyword;
    // Add already existing keyword or newly created keyword.
    $scope.addKeywordToNote(note, keywordToAdd);
  };

  $scope.addKeywordToNote = function(note, keyword) {
    if (!$scope.note.trans.keywords) $scope.note.trans.keywords = [];
    $scope.note.trans.keywords.push(keyword);
    clearKeyword();
  };

  $scope.removeKeywordFromNote = function(note, keyword) {
    note.trans.keywords.splice(note.trans.keywords.indexOf(keyword), 1);
  };

  $scope.getKeywordsListString = function(note) {
    var keywordsList = '';

    for (var i = 0; i < note.trans.keywords.length; i++) {
      keywordsList += '#' + note.trans.keywords[i].trans.title; // Add hash character into keyword
      if (i !== note.trans.keywords.length - 1) {
        // Separate keywords with comma and non-breaking space.
        // NOTE:  Non-breaking space is used to make Clamp.js (when used) work better - with regular space it
        //        would remove word following the space leaving trailing comma + ellipsis in the end.
        //        With nbsp, last keyword is split.
        keywordsList += ',\xA0';
      }
    }
    return keywordsList;
  };

  $scope.openKeywordsPicker = function() {
    $scope.keywordsPickerOpen = true;
  };

  $scope.closeKeywordsPicker = function() {
    $scope.keywordsPickerOpen = false;
  };

  $scope.collapsibleOpen = false;
  $scope.toggleCollapsible = function() {
    $scope.collapsibleOpen = !$scope.collapsibleOpen;
  };

}

NoteEditorController['$inject'] = ['$scope', 'NotesService', 'TagsService', 'UISessionService'];
angular.module('em.main').controller('NoteEditorController', NoteEditorController);
