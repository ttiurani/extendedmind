/*global angular*/
/*jslint eqeq: true plusplus: true*/

( function() {'use strict';

    angular.module('em.services').factory('tagsArray', ['itemsArray',
    function(itemsArray) {
      var tags;
      tags = [];

      return {
        setTags : function(tagsResponse) {
          if (tagsResponse != null) {
            var i = 0;

            while (tagsResponse[i]) {
              this.setTag(tagsResponse[i]);
              i++;
            }
          } else {
            tags = [];
          }
        },
        setTag : function(tag) {
          if (!itemsArray.itemInArray(tags, tag.uuid)) {
            tags.push(tag);
          }
        },
        getTags : function() {
          return tags;
        },
        putNewTag : function(tag) {
          if (!itemsArray.itemInArray(tags, tag.title)) {
            tags.push(tag);
          }
        },
        getTagByUuid : function(uuid) {
          return itemsArray.getItemByUuid(tags, uuid);
        }
      };
    }]);
  }());
