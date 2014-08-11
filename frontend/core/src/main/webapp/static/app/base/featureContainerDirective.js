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

 function featureContainerDirective($rootScope, SnapService, SwiperService, UISessionService, UserSessionService) {
  return {
    restrict: 'A',
    controller: function($scope, $element) {

      var featureElements = {};

      // COMMON FEATURE METHODS IN SCOPE

      $scope.getActiveFeature = function getActiveFeature() {
        return UISessionService.getCurrentFeatureName();
      };

      $scope.isFeatureActive = function isFeatureActive(feature) {
        return $scope.getActiveFeature() === feature;
      };

      $scope.hasFeatureFooter = function hasFeatureFooter() {
        if ($scope.isFeatureActive('tasks') ||
          $scope.isFeatureActive('notes') ||
          $scope.isFeatureActive('dashboard') ||
          $scope.isFeatureActive('archive') ||
          $scope.isFeatureActive('list'))
        {
          if (UserSessionService.getUIPreference('hideFooter') &&
            ($rootScope.packaging.endsWith('cordova') || $rootScope.packaging === 'devel'))
          {
            return false;
          } else {
            return true;
          }
        } else {
          return false;
        }
      };

      $scope.getFooterVisibilityClass = function getFooterVisibilityClass() {
        if (!$scope.hasFeatureFooter()) return 'hide-footer';
      };

      // UI SESSION SERVICE HOOKS

      var featureChangedCallback = function featureChangedCallback(name, data, state) {
        setFeatureContainerClass(name);
        if (featureElements[name]) {
          SnapService.setDraggerElement(featureElements[name].dragElement);
        }

        if (!state) state = UISessionService.getFeatureState(name);
      };
      UISessionService.registerFeatureChangedCallback(featureChangedCallback, 'featureContainerDirective');
      if (!UISessionService.getCurrentFeatureName()) {
        if ($scope.onboardingInProgress) {
          UISessionService.changeFeature('inbox');
        } else {
          UISessionService.changeFeature('tasks');
        }
      } else {
        // Need to explicitly call feature change
        featureChangedCallback(UISessionService.getCurrentFeatureName());
      }

      // SWIPER SERVICE HOOKS

      var slideChangedCallback = function slideChangedCallback(activeSlidePath) {

        // Don't set to main slide path, if page slide path is already set
        if (!UISessionService.getFeatureState(UISessionService.getCurrentFeatureName()) ||
          !UISessionService.getFeatureState(UISessionService.getCurrentFeatureName()).startsWith(activeSlidePath))
        {
          UISessionService.setCurrentFeatureState(activeSlidePath);
        }
      };

      SwiperService.registerSlideChangeCallback(slideChangedCallback, 'tasks', 'featureContainerDirective');
      SwiperService.registerSlideChangeCallback(slideChangedCallback, 'tasks/home', 'featureContainerDirective');
      SwiperService.registerSlideChangeCallback(slideChangedCallback, 'notes', 'featureContainerDirective');
      SwiperService.registerSlideChangeCallback(slideChangedCallback, 'dashboard', 'featureContainerDirective');
      SwiperService.registerSlideChangeCallback(slideChangedCallback, 'archive', 'featureContainerDirective');

      // CALLBACK REGISTRATION

      this.registerSnapDrawerDragElement = function registerSnapDrawerDragElement(feature, element) {
        if ($scope.isFeatureActive(feature)) {
          SnapService.setDraggerElement(element);
        }
        if (!featureElements[feature]) featureElements[feature] = {};
        featureElements[feature].dragElement = element;
      };

      // SET CORRECT CLASSES TO FEATURE CONTAINER ELEMENT

      setFeatureContainerClass($scope.getActiveFeature());

      // https://developer.mozilla.org/en-US/docs/Web/API/Element.classList
      function setFeatureContainerClass(feature) {
        if (feature === 'tasks' ||
          feature === 'notes' ||
          feature === 'dashboard' ||
          feature === 'archive' ||
          feature === 'list')
        {
          $element[0].classList.toggle('no-slides-container', false);
          $element[0].classList.toggle('slides-container', true);
        } else {
          $element[0].classList.toggle('no-slides-container', true);
          $element[0].classList.toggle('slides-container', false);
        }
      }
    },
    link: function postLink(scope, element) {

      function initializeSnapper() {
        SnapService.createSnapper(element[0].parentNode);

        SnapService.registerAnimatedCallback(snapperAnimated);
        SnapService.registerEndCallback(snapperPaneReleased);
        SnapService.registerCloseCallback(snapperClosed);
      }

      // No clicking/tapping when drawer is open.
      function drawerContentClicked(event) {
        if (SnapService.getState().state !== 'closed') {
          event.preventDefault();
          event.stopPropagation();
        }
      }

      // Snapper is "ready". Set swiper and snapper statuses.
      function snapperAnimated(snapperState) {
        if (snapperState.state === 'closed') {
          angular.element(element[0].parentNode).unbind('touchstart', drawerContentClicked);
          if (scope.getActiveFeature()) {
            SwiperService.setSwiping(scope.getActiveFeature(), true);
            SnapService.enableSliding();
            // make following happen inside angularjs event loop
            scope.$evalAsync(function() {
              scope.setIsWebkitScrolling(true);
            });
          }
        } else if (snapperState.state === 'left') {
          angular.element(element[0].parentNode).bind('touchstart', drawerContentClicked);
          if (scope.getActiveFeature()) {
            SwiperService.setSwiping(scope.getActiveFeature(), false);
            SnapService.enableSliding();
          }
        }
      }

      function snapperClosed() {
        if (scope.getActiveFeature()) {
          SwiperService.setSwiping(scope.getActiveFeature(), true);
          SnapService.disableSliding();
        }
      }

      // Enable swiping and disable sliding and vice versa when snapper pane is released and animation starts.
      function snapperPaneReleased(snapperState) {
        // This if statement is according to current understanding the most reliable (yet not the most intuitive)
        // way to detect that the drawer is closing.
        if (snapperState.info.opening === 'left' && snapperState.info.towards === 'left' && snapperState.info.flick) {
          if (scope.getActiveFeature()) {
            SwiperService.setSwiping(scope.getActiveFeature(), true);
            SnapService.disableSliding();
          }
          // Drawer is opening
        } else if (snapperState.info.towards === 'right' && snapperState.info.flick) {
          if (scope.getActiveFeature()) {
            SwiperService.setSwiping(scope.getActiveFeature(), false);
            SnapService.enableSliding();
          }
        }
      }

      initializeSnapper();

      scope.$on('$destroy', function() {
        SnapService.deleteSnapper();
        angular.element(element).unbind('touchstart', drawerContentClicked);
      });
    }
  };
}
featureContainerDirective['$inject'] = ['$rootScope', 'SnapService', 'SwiperService', 'UISessionService', 'UserSessionService'];
angular.module('em.directives').directive('featureContainer', featureContainerDirective);
