// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";

  angular.module('em.directives', []).directive('appVersion', [
    'version', function(version) {
      return function(scope, elm, attrs) {
        return elm.text(version);
      };
    }
  ]);

}).call(this);
