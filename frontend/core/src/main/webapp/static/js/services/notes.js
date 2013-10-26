/*global angular*/
/*jslint eqeq: true plusplus: true*/

( function() {'use strict';

    angular.module('em.services').factory('notesRequest', ['httpRequest', 'itemsResponse', 'userSessionStorage',
    function(httpRequest, itemsResponse, userSessionStorage) {
      return {
        putNote : function(note) {
          return httpRequest.put('/api/' + userSessionStorage.getActiveUUID() + '/note', note).then(function(putNoteResponse) {
            return putNoteResponse.data;
          });
        },
        deleteNote : function(note) {
          return httpRequest['delete']('/api/' + userSessionStorage.getActiveUUID() + '/note/' + note.uuid).then(function(deleteNoteResponse) {
            return deleteNoteResponse.data;
          });
        },
        putExistingNote : function(note) {
          return httpRequest.put('/api/' + userSessionStorage.getActiveUUID() + '/note/' + note.uuid, note).then(function(putExistingNoteResponse) {
            return putExistingNoteResponse.data;
          });
        }
      };
    }]);

    angular.module('em.services').factory('notesResponse', ['itemsResponse',
    function(itemsResponse) {
      return {
        putNoteContent : function(note, putNoteResponse) {
          itemsResponse.putItemContent(note, putNoteResponse);
        }
      };
    }]);

    angular.module('em.services').factory('notesArray', ['itemsArray',
    function(itemsArray) {
      var notes;
      notes = [];

      return {
        setNotes : function(notesResponse) {

          itemsArray.clearArray(notes);

          if (notesResponse != null) {
            var i = 0;

            while (notesResponse[i]) {
              this.setNote(notesResponse[i]);
              i++;
            }
          }
        },
        setNote : function(note) {
          if (!itemsArray.itemInArray(notes, note.uuid)) {
            notes.push(note);
          }
        },
        getNotes : function() {
          return notes;
        },
        removeNote : function(note) {
          itemsArray.removeItemFromArray(notes, note);
        },
        putNewNote : function(note) {
          if (notes == null) {
            notes = [];
          }
          if (!itemsArray.itemInArray(notes, note.uuid)) {
            notes.push(note);
          }
        },
        getNoteByUUID : function(uuid) {
          return itemsArray.getItemByUUID(notes, uuid);
        }
      };
    }]);
  }());
