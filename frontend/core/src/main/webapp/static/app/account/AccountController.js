'use strict';

function AccountController($rootScope, $location, $scope, AccountService, AnalyticsService, UserSessionService) {

  $scope.isUserVerified = false;
  AnalyticsService.visit('account');

  $scope.settings = {};

  AccountService.getAccount().then(function(accountResponse) {
    $scope.isUserVerified = accountResponse.emailVerified ? true : false;
    $scope.email = accountResponse.email;
    var userPreferences = UserSessionService.getPreferences();
    if (userPreferences.ui && userPreferences.ui.hidePlus !== undefined){
      $scope.settings.hidePlus = userPreferences.ui.hidePlus;
    }
  });

  $scope.gotoChangePassword = function gotoChangePassword() {
    $location.path('/my/account/password');
  };

  $scope.showOnboardingChecked = function() {
    var userPreferences = UserSessionService.getPreferences();
    if ($scope.settings.showOnboarding){
      UserSessionService.setPreference('onboarded', undefined);
    }else{
      UserSessionService.setPreference('onboarded', $rootScope.packaging);
    }
    AccountService.updateAccountPreferences();
  };

  $scope.hidePlus = function() {
    var userPreferences = UserSessionService.getPreferences();
    if (!userPreferences.ui) userPreferences.ui = {}
    if ($scope.settings.hidePlus){
      userPreferences.ui.hidePlus = true;
    }else{
      userPreferences.ui.hidePlus = false;
    }
    UserSessionService.setPreferences(userPreferences);
    AccountService.updateAccountPreferences();
  };

  $scope.showOnboardingSetting = function() {
    // Only show the onboarding checkbox for ALFA and ADMIN users
    if (UserSessionService.getUserType() === 0 || UserSessionService.getUserType() === 1){
      return true;
    }
  };
}

AccountController['$inject'] = ['$rootScope', '$location', '$scope', 'AccountService', 'AnalyticsService', 'UserSessionService'];
angular.module('em.app').controller('AccountController', AccountController);
