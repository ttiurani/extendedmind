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

 function ToolbarController($scope, $rootScope, UISessionService) {

  $scope.calculateHeadingWidth = function() {
    if ($rootScope.currentWidth >= $rootScope.CONTAINER_MASTER_MAX_WIDTH) {
      // Maximum width for column
      return $rootScope.TOOLBAR_HEADING_MAX_WIDTH;
    } else {
      // Smaller, leave
      return $rootScope.currentWidth - $rootScope.TOOLBAR_BUTTON_WIDTH*2;
    }
  };

  /*
  * Show feature name, list title or onboarding phase in heading.
  */
  $scope.getCurrentHeading = function getCurrentHeading() {
    if ($scope.onboardingInProgress) {
      return $scope.getOnboardingPhase();
    } else {
      var currentHeading = $scope.getActiveFeature();
      if (currentHeading === 'list'){
        currentHeading = UISessionService.getFeatureData(currentHeading).title;
      }else if (currentHeading === 'user'){
        currentHeading = $scope.getActiveDisplayName();
      }
      if (!$scope.online) {
        currentHeading = '*' + currentHeading;
      }
      return currentHeading;
    }
  };

  $scope.isToolbarMenuHidden = function() {
    if ($scope.onboardingInProgress) {
      if (!$scope.isOnboarded('tasks') &&
          ($scope.checkListOnboardingLock('tasks', undefined) ||
           $scope.checkListOnboardingLock('tasks', 'on')) &&
          $scope.getActiveFeature() === 'tasks')
      {
        return true;
      }
      else if (!$scope.isOnboarded('lists') &&
               ($scope.checkListOnboardingLock('lists', 'off') ||
                $scope.checkListOnboardingLock('lists', 'on')) &&
               $scope.getActiveFeature() === 'lists')
      {
        return true;
      }
    }
  };

  function switchFeature() {
    var activeFeature = $scope.getActiveFeature();
    if (activeFeature === 'focus') {
      $scope.changeFeature('inbox', undefined, true);
    } else {
      $scope.changeFeature('focus', undefined, true);
    }
  }

  $scope.clickToolbarHeading = function(){
    var activeFeature = $scope.getActiveFeature();
    if (activeFeature === 'list'){
      $scope.openEditor('list', UISessionService.getFeatureData(activeFeature));
    }else{
      switchFeature();
    }
  };
}
ToolbarController['$inject'] = ['$scope', '$rootScope', 'UISessionService'];
angular.module('em.main').controller('ToolbarController', ToolbarController);
