/*global angular */
/*jslint white: true */

( function() {'use strict';

    function AccountController($location, $scope, authenticateRequest, errorHandler) {

        $scope.errorHandler = errorHandler;

        authenticateRequest.account().then(function(authenticateResponse) {
            $scope.email = authenticateResponse.email;
        });
    }

    AccountController.$inject = ['$location', '$scope', 'authenticateRequest', 'errorHandler'];
    angular.module('em.app').controller('AccountController', AccountController);
}());
